
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
    factory: function (specific) {
        if (specific) {
            var ch = Chord.build(specific);
        } else {
            var ch = ChordModel.getRandom();
        }
        last = ChordModel.last();
        ch.pk = last ? last.pk + 1: 0;
        ch.num_attempt = 0;
        ch.guess = null;
        ch.correct = null;
        return ChordModel.create(ch);
    },

    /**
     * Method to create a random chord using the guitarjs lib
     */
    getRandom: function() {
        var note = Notes.names[Math.floor(Math.random()*Notes.names.length)];
        var type = Chord.TYPES[Math.floor(Math.random()*Chord.TYPES.length)];
        var chord_name = note+" "+type.code;
        // var chord_name = 'A Maj'; // for testing
        return Chord.build(chord_name);        
    },

    award_bonus: function (curr) {
        if (curr.is_first()) {
            return;
        }
        // strike bonus after both the first as well as second rolls
        ChordModel.award_strike_bonus(curr);

        // spare bonus after the first roll only
        if (curr.num_attempt === 1) {
            ChordModel.award_spare_bonus(curr);        
        }
    },

    award_strike_bonus: function (curr) {
        var prev = curr.prev();
        var bonus = curr.get_score().roll_score();
        var count = 0;
        while (prev.get_score().is_strike() && count < 2) {

            // don't award bonus to bonus chords (11 and 12)
            if (prev.chord_pk > 9) break;

            prev.get_score().add_bonus(bonus);
            prev = prev.prev(); // variable name #fail!
            if (!prev) break;
            count++;
        }
    },

    // TODO
    award_spare_bonus: function (curr) {
        var prev = curr.prev();
        var bonus = curr.get_score().roll_score();
        if (prev.get_score().is_spare()) {
            prev.get_score().add_bonus(bonus);
        }
    }
});

// object properties
ChordModel.include({

    is_first: function () {
        return (this.pk === 0);
    },

    is_last: function () {
        switch (this.pk) {
        case 9:
            return !(this.get_score().is_strike() || this.get_score().is_spare());            
        case 10:
            return !(this.get_score().is_strike());
        case 11:
            return true;
        default:
            return false
        }
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
        if (prev.length) {
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
        if (next.length) {
            return next[0];
        } else {
            return false;
        }
    },

    /**
     * Method to check the number of max guesses per chord
     */
    max_guesses: function () {
        // max under normal conditions
        var max = 2;

        // but if 11th chord is awarded due to spare in tenth frame, then it will
        // have max 1 guess only
        if (this.pk === 10) {
            var tenth = this.prev();
            if (tenth.get_score().is_spare()) {
                max = 1;
            }
        } else if (this.pk === 11) {
            max = 1;
        }

        return max;
    },

    /**
     * Method to check if any more guesses can be made for this chord
     */
    can_guess: function () {
        var max = this.max_guesses();

        if (this.num_attempt < max) {
            if (this.score_id) {
                return (!this.get_score().is_strike());
            } 
            return true;
        }
        return false;
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
            var score = ScoreModel.create({ scores: [], chord_pk: this.pk, total: 0, bonus: 0 });
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
        return this.scores.length;
    },

    /**
     * Method to compute the score after each roll
     * ie. it will return the points scored in the last roll only
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
        return this.scores[this.scores.length - 1]
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

ScoreModel.extend({

    final_score: function () {
        var total = 0;
        ScoreModel.each(function (score) {
            if (score.chord_pk <= 9) {
                total += score.total;
            }
        });
        return total;
    }

});
