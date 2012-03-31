/**
 * Code for all the controllers as well as the app controller
 */

jQuery(function($) {
    
    window.TenChordApp = Spine.Controller.create({
        el: $("#wrapper"),

        proxied: ["render", "confirmed"],

        events: {
            "click #next-btn": "next",
            "click #prev-btn": "prev",
            "click #confirm-guess": "confirm"
        },

        elements: {
            "#score-board": "scoreboard",
            "#question": "question",
            "#next-btn": "nextBtn",
            "#prev-btn": "prevBtn",
            "#confirm-guess": "confirmBtn",
            "#buttons a": "controlButtons"
        },

        gameover: false,
        
        init: function () {
            // create the note buttons
            this.notePicker = NotePicker.init();
            this.scoreboard = Scoreboard.init();
            ChordModel.bind("create", this.render);
            ChordModel.bind("update", this.confirmed);            
            this.chord = OneChord.init();             
            // show the first chord right away
            ChordModel.factory();
        },

        /**
         * next chord
         * if next present shown, else create new
         */
        next: function () {
            var next = this.chord.current.next();
            if (next) {
                this.render(next);
                return;
            } else {
                ChordModel.factory();
            }            
        },

        /**
         * show the previous chord
         * not present case is impossible. So defensively throw an Error
         */
        prev: function () {
            var prev = this.chord.current.prev();
            if (prev) {
                this.render(prev);
                return;
            } else {
                throw new Error('Previous chord not found?!');
            }            
        },

        /**
         * Render the chord on the screen
         * @param ChordModel record
         */
        render: function (chord) {
            this.chord.change(chord);
            this.updateButtons();
            this.notePicker.change(chord);
            return false;
        },

        /**
         * on click of the confirm/roll button
         * will be used to confirm the guess made by the user.
         * ..for both the attempts
         */
        confirm: function () {
            if (!this.chord.current.can_guess()) {
                return;
            }
            var guess = this.notePicker.getMarked("guessed");
            if (!guess[0]) {
                alert("Please select some notes by clicking on them");
                return;
            }
            this.chord.saveGuess(guess);
        },

        /**
         * Will be called after a guess has been confirmed.
         * Callback function of the update event of ChordModel
         */
        confirmed: function (chord) {
            var score = ScoreModel.find(chord.score_id);
            this.scoreboard.update(score);
            this.updateButtons();
            this.notePicker.updateStatuses(chord);

            // if this chord is the last one, set the gameover flag to true
            if (this.chord.current.is_last()) {
                this.gameover = true;
                setTimeout(this.scoreboard.display_final_score, 200);
            }
        },

        /**
         * Method to update the states of the previous, next and the roll
         * buttons for this chord
         * if its the first chord, hide the prev button
         * if its the last (10th) chord, hide the next button
         * if its a strike show the next button and hide roll
         */
        updateButtons: function () {
            // hide all buttons first
            this.controlButtons.hide();
            this.confirmBtn.show();
            var chord = this.chord.current;
            // if not last AND if all attempts consumed
            if (!chord.is_last() && !chord.can_guess()) {
                this.nextBtn.show();
            }
            // if not first, show "prev" button
            if (!chord.is_first()) {
                this.prevBtn.show();
            }
        }
    });

    window.OneChord = Spine.Controller.create({
        el: $("h2#question"),        

        init: function () {

        },

        /**
         * Change the current chord
         */
        change: function (item) {            
            this.current = item;
            this.render();
        },

        render: function () {
            this.el.text(this.current.name);            
            var $list = $("#chord-list");
            $list.children().removeClass('active');
            // append to the chord list if its a new chord
            if (!$("#pk-"+this.current.pk).length) {
                var elements = $("#chordlistTemplate").tmpl(this.current);            
                $list.append(elements[0]);
            } else {
                $("#pk-"+this.current.pk).addClass('active');
            }
        },

        saveGuess: function (guess) {
            this.current.evaluate(guess);
        }
    });

    window.NotePicker = Spine.Controller.create({
        el: $("ul#notes"),
        
        elements: {
            "#notes li": "button"
        },

        events: {
            "click #notes li": "toggleGuess"
        },

        proxied: ["toggleGuess", "onGuess"],

        NOTE_STATUS: {
            guessed: "guessed-note",
            correct: "correct-note",
            incorrect: "incorrect_note"
        },

        init: function () {
            this.render();
            ScoreModel.bind("update", this.onGuess);
        },

        render: function () {
            var html = '',
            n;            
            for (var i in Notes.names) {
                n = Notes.names[i];
                html += '<li id="'+Notes.slugify(n)+'">' + n + '</li>';
            }
            this.el.append(html);            
        },

        /**
         * Will mark and unmark the clicked note as guessed note
         */
        toggleGuess: function (event) {
            var $trgt = $(event.target);
            if (!$trgt.hasClass(this.NOTE_STATUS.correct)) {
                $(event.target).toggleClass(this.NOTE_STATUS.guessed);
            }
        },

        /**
         * Will clear all the guessed notes
         */
        clear: function () {
            var statuses = this.NOTE_STATUS;
            this.el.children().each(function () {
                $(this).removeClass(statuses.guessed + ' ' + statuses.correct + ' ' + statuses.incorrect);
            });
        },

        /**
         * When a chord is changed, the buttons will be 
         * marked/unmarked accordingly
         */
        change: function (chord) {
            this.clear();
            this.updateStatuses(chord);
        },

        /**
         * Update the statuses of the notes everytime a chord is changed
         * or a guess is made
         * statuses = ('guesses', 'correct', 'incorrect')
         * @param Chord_Model chord
         */
        updateStatuses: function (chord) {
            // console.log(chord);
            if (chord.guess) {
                this.mark(chord.guess, 'guessed');
            }
            if (chord.correct) {
                this.mark(chord.correct, 'correct');
            }
        },

        /**
         * after the user makes a guess, this method will be 
         * called as a callback of update event of the 
         * ScoreModel object
         * Depending upon the correctness of the guesses, the 
         * notes will be highlighted
         */
        onGuess: function (score) {
            // console.log(this.currentChord);
        },

        /**
         * will mark the note as guessed by the user
         * @param name - string - name of the note to be marked
         * @param status - string - status it is to be marked as 
         */
        mark: function (notes, status) {
            if (typeof notes === 'string') {
                var name = notes,
                class_attr = this.NOTE_STATUS[status];
                $("#"+Notes.slugify(name)).addClass(class_attr);
            } else if (typeof notes === 'object') {
                for (var i = 0; i < notes.length; i++) {
                    this.mark(notes[i], status);
                }
            }
        },

        getMarked: function (status) {
            var marked = [],
            class_attr = this.NOTE_STATUS[status];
            this.el.children().filter("."+class_attr).each(function () {
                marked.push(Notes.unslugify($(this).attr('id')));
            });
            return marked;
        },

    });

    window.Scoreboard = Spine.Controller.create({
        el: $("#score-board>ul"),

        proxied: ["scoreChanged"],

        init: function () {
            this.render();
            ScoreModel.bind('change', this.scoreChanged);
        },

        render: function () {
            var html = '';
            for (var j = 0; j < 10; j++) {
                if (j === 0) {
                    html += '<li class="leftmost">';                    
                } else if (j === 9) {
                    html += '<li class="rightmost">'
                } else {
                    html += '<li>';
                }
                html += '<ul class="chances">';
                var k = j === 9 ? 3 : 2;
                for (var i = 0; i < k; i++) {
                    html += '<li></li>';
                }
                html += '</ul>';
                html += '<div></div>';
                html += '</li>';
            }
            this.el.append(html);
        },

        /**
         * Callback for score change.
         * Since it's also invoked whenever a new chord is loaded (score is 0 then), 
         * we need to handle the case of chord 10 in case of which, the bonus chords
         * 11/12 awarded to adjust strike and spare bonus points are also shown in the
         * same scorecard
         */
        scoreChanged: function (event, score) {            
            var chord_pk = score.chord_pk;
            if (chord_pk > 9) {
                var tenth_score = this.getScoreCard(9).children().filter('div').text();
                var total_score = parseInt(tenth_score) + score.total;
                this.getScoreCard(9).children().filter('div').text(total_score);
            } else {
                this.getScoreCard(score.chord_pk).children().filter('div').text(score.total);
            }
        },

        /**
         * Method to update the ui with the score
         * @param ScoreModel score associated with the chord
         */
        update: function (score) {
            var scores = score.scores,
            attempt = scores.length,
            box_index = Scoreboard.getRollScoreBox(attempt, score.chord_pk),
            box = this.getScoreCard(score.chord_pk).children().filter('ul.chances').children().eq(box_index);
            // score for this roll only
            if (score.is_strike()) {
                var roll_score = 'X';
            } else if (score.is_spare()) {
                var roll_score = '/';
            } else {
                var roll_score = score.roll_score();
            }            
            box.text(roll_score);
        },

        /**
         * Get the score card (block) for the current frame
         * @param int chord_pk primary key of the current chord
         * @return jQuery Object 
         */
        getScoreCard: function (chord_pk) {
            // for 10th and 11th chords, the 10th chord score card is used
            var idx = (chord_pk > 9) ? 9 : chord_pk;
            return this.el.children().eq(idx);
        },

        /**
         * Display the final score
         */
        display_final_score: function () {
            var finalscore = ScoreModel.final_score();
            $("#final-score").text(finalscore).slideDown(400);
        }
    });

    window.Scoreboard.extend({
        
        /**
         * Get the correct li index to show the score for this roll
         * This is computed using the attempt number and total attempts
         * Method can be avoided if float: left used instead of float: right
         * @param int attempt the number of attempt [1,2,3]
         * @param int chord_pk primary key of the current chord
         * @return int index of the li element 
         */
        getRollScoreBox: function (attempt, chord_pk) {
            if (chord_pk < 9) {
                return Math.abs(attempt - 2);
            } else if (chord_pk === 9) {
                return Math.abs(attempt - 3);
            } else if (chord_pk === 10) {

                // if tenth chord is strike, we need two more boxes
                // otherwise we need only one more boxes
                var selected = ChordModel.select(function (chord) {
                    return (chord.pk === 9);
                });
                var tenth = selected[0];
                if (tenth.get_score().is_strike()) {
                    return 1;
                }
                return 0;

            } else if (chord_pk === 11) {

                // the last box
                return 0;

            } else {
                throw new Error('The upper bound for chord_pk is 11. '+chord_pk+' is invalid');
            }            
        }
    });

    window.App = TenChordApp.init();

});
