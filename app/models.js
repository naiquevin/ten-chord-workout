
/**
 * Model ChordModel
 * Properties:
 * pk - int - primary key (starts at 0)
 * name - string - name of the chord
 * notes - array - notes in the chord
 * guess - array - notes guessed by the user
 * correct - array - most recent guess by the user
 * num_attempt - int - start with 0, 1, 2 is max
 * score_id - id reference of the ScoreModel Object stored in memory
 */

var ChordModel = Spine.Model.setup("ChordModel", 
                                   ["pk", 
                                    "name", 
                                    "notes", 
                                    "guess", 
                                    "correct", 
                                    "num_attempt",
                                    "score_id"
                                   ]
                                  );


// Class Properties
ChordModel.extend({

    /**
     * Method to create a new object
     */
    factory: function () {
        var ch = ChordModel.getRandom(),
        last = ChordModel.last();
        ch.pk = last ? last.pk + 1: 0;
        ch.num_attempt = 0;
        ChordModel.create(ch);
        return ch;
    },

    /**
     * Method to create a random chord using the guitarjs lib
     */
    getRandom: function() {
        var note = Notes.names[Math.floor(Math.random()*Notes.names.length)],
        type = Chord.TYPES[Math.floor(Math.random()*Chord.TYPES.length)],
        // chord_name = note+" "+type.code;
        chord_name = "A Maj";
        return Chord.build(chord_name);        
    },

    award_bonus: function (curr) {
        if (curr.is_first()) {
            return;
        }
        // strike bonus
        ChordModel.award_strike_bonus(curr);
        // ChordModel.award_spare_bonus(curr);        
    },

    award_strike_bonus: function (curr) {
        var prev = curr.prev();
        var bonus = curr.get_score().roll_score();
        count = 0;
        while (prev.get_score().is_strike() && count < 2) {
            count++;            
            prev.get_score().add_bonus(bonus);
            prev = prev.prev(); // variable name #fail!
            if (!prev) break;
        }
    },

    // TODO
    award_spare_bonus: function (curr) {
        var prev = curr.prev();
        var bonus = curr.get_score().roll_score();
        if (prev.is_spare()) {
            
        }
    }
});

// object properties
ChordModel.include({

    is_first: function () {
        return (this.pk === 0);
    },

    is_last: function () {
        return (this.pk === 9);
    },

    /**
     * @return ChordModel/boolean 
     * prev if prev record is found it is returned other wise return false
     */
    prev: function () {
        var that = this;
        var prev = ChordModel.select(function (chord) {
            if (chord.pk === that.pk-1) return true;
        });
        if (prev) {
            return prev[0];
        } else {
            return false;
        }
    },

    /**
     * @return ChordModel/boolean 
     * next if next record is found it is returned other wise return false
     */
    next: function () {
        var that = this;
        var next = ChordModel.select(function (chord) {
            if (chord.pk === that.pk+1) return true;
        });
        if (next) {
            return next[0];
        } else {
            return false;
        }
    },

    /**
     * Method to check if any more guesses can be made for this chord
     */
    can_guess: function () {
        var max = (this.pk === 9) ? 3 : 2;
        return this.num_attempt < max;
    },

    /**
     * Method to evaluate the guess and save the object
     * @param guess
     */
    evaluate: function (guess) {
        var correct = [];
        for (var i = 0; i < guess.length; i++) {
            if ($.inArray(guess[i], this.notes) !== -1) {
                correct.push(guess[i]);
            }
        }
        var score = Math.round(correct.length/this.notes.length * 10);
        this.guess = guess;
        this.num_attempt++;
        this.correct = correct;
        this.get_score().update_score(score);
        this.save();
        ChordModel.award_bonus(this);
    },
    
    /**
     * Method to get the score object associated with the chord
     * if no score object associated yet, create and save it
     */
    get_score: function () {
        if (this.score_id) {
            var score = ScoreModel.find(this.score_id);
        } else {
            var score = ScoreModel.create({ scores: [], chord_pk: this.pk });
            score.save();
            this.score_id = score.id;
        }
        return score;
    }
});

var ScoreModel = Spine.Model.setup("ScoreModel", ["chord_pk", "scores", "total", "bonus"]);

ScoreModel.include({

    chord: function () {
        var that = this;
        var chord = ChordModel.select(function (c) {
            if (c.pk === that.chord_pk) return true;
        });
        return chord[0];
    },

    /**
     * Method to determine if a strike has occured
     * @return boolean
     */
    is_strike: function () {
        var attempt = this.attempt_count();        
        var score_so_far = this.frame_score();
        return (attempt === 1 && score_so_far === 10);        
    },

    /**
     * Method to determine if a spare has occured
     * @return boolean
     */
    is_spare: function () {
        var attempt = this.attempt_count(),
        score_so_far = this.frame_score();
        return (attempt === 2 && score_so_far === 10);
    },

    scores_array: function () {
        return this.scores;
    },

    attempt_count: function () {
        // if initially no chord is set
        if (this.chord()) {
            return this.chord().num_attempt;            
        }
        return 0;
    },

    /**
     * Method to compute the score after each roll
     * @return int score for this roll
     */
    roll_score: function () {
        var scores = this.scores_array();
        var num_attempt = this.attempt_count();
        if (num_attempt === 2) {
            return scores[1] - scores[0];
        } else if (num_attempt === 1) {
            return scores[0];
        }
    },

    /**
     * Method to compute the total score for each frame so far (without the bonus)
     * Do not use total here as total also includes the bonus
     * @return int total score for the frame so far
     */
    frame_score: function () {
        var scores = this.scores_array();
        return scores[scores.length - 1];
    },

    update_score: function (score) {
        this.scores.push(score);
        this.total = this.frame_score(); 
        this.save();
    },

    /**
     * Method to add bonus points to the frame score
     */
    add_bonus: function (score) {
        this.bonus = !this.bonus ? 0 : this.bonus;
        // console.log(this.bonus, score);
        var bonus = this.bonus + score;
        this.total = this.frame_score() + bonus;
        this.bonus = bonus;
        this.save();
    }
});
