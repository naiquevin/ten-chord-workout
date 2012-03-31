$(document).ready(function () {

    module("Testing ChordModel factory", {
        teardown: function () {
            ChordModel.destroyAll();
        }
    });

    test('Optional Argument `specific` works', function () {
        var chord = ChordModel.factory("A Maj");
        same(chord.notes, ['A', 'C#', 'E'], 'A major chord was specified and was created correctly');
    });

    test('Initial property values of ChordModel objects', function () {
        var chord = ChordModel.factory();
        equals(chord.pk, 0, 'primary key is 0 being the first chord');
        ok(chord.name, 'has a non-blank name');
        ok(chord.notes.length > 1, 'chord created is made up of more than 1 notes');
        equal(chord.guess, null, 'the guess property is null');
        equal(chord.correct, null, 'so is the correct property');
        equal(chord.num_attempt, 0, 'no attempts are made');
        equal(chord.score, undefined, 'score is null');
    });

    module("Testing ChordModel", {
        // create 10 chord objects before each test
        setup: function () {
            var i = 0;
            while (i < 10) {
                this['chord'+(i++)] = ChordModel.factory();                
            }
        },
        // and destroy the collection after running it
        teardown: function () {
            ChordModel.destroyAll();
        }
    });

    test('Is First', function () {
        ok(this.chord0.is_first(), 'This is the first chord in the model collection');
        ok(!this.chord1.is_first(), 'But this is not the first chord');
    });

    test('ChordModel Primary Key', function () {
        equals(this.chord0.pk, 0, 'The models collection is zero indexed');
        equals(this.chord1.pk, this.chord0.pk + 1, 'Primary key increases by 1');        
    });

    test('prev method', function () {
        ok(!this.chord0.prev(), 'There is no prev chord');
        var prev = this.chord1.prev();
        equals(typeof prev, 'object', 'Previous chord exists and is an object..');
        equals(prev.pk, this.chord1.pk - 1);
    });

    test('next method', function () {
        var next = this.chord0.next();
        equals(typeof next, 'object', 'Next chord exists and is an object..');
        ok(!this.chord9.next(), 'Last (10th) chord doesn\'t have a next chord and returns false');
    });

    test('is_last', function () {
        ok(this.chord9.is_last(), 'The 10th chord is the last one');
        equals(this.chord9.pk, 9, 'Being zero indexed, it\'s pk field value is 9');
        ok(!this.chord4.is_last(), 'The 5th chord is not the last one');
    });        

    module("Testing Evaluation of guesses", {
        teardown: function () {
            ChordModel.destroyAll();
        }
    });

    test("Testing the evaluate and can_guess methods", function () {
        // create a known chord
        var chord = ChordModel.factory('A Maj')
        var guess = ['A', 'C', 'E'];
        chord.evaluate(guess);
        same(chord.guess, guess, 'guess is direct saved as the obj property');
        equal(chord.num_attempt, 1, 'one attempt is consumed')
        same(chord.correct, ['A', 'E'], 'A and E were guessed correctly');        
        ok(chord.can_guess(), 'The user can guess one more time');
        // make another guess
        var guess2 = ['A', 'C', 'F'];
        chord.evaluate(guess2);
        same(chord.guess, guess2, 'guess is direct saved as the obj property');
        equal(chord.num_attempt, 2, 'one attempt is consumed')
        same(chord.correct, ['A'], 'A was guessed correctly');        
        ok(!chord.can_guess(), 'Both guesses consumed. No more guesses allowed');
    });

    test("Testing ScoreModel instance methods", function () {
        var score = ScoreModel.create({ scores: [], chord_pk: 0, total: 0, bonus: 0 });
        score.save();
        equal(score.scores.length, 0);
        equal(score.total, 0);
        equal(score.bonus, 0);
        score.update_score(3);
        same(score.scores, [3]);
        equal(score.total, 3);
        equal(score.frame_score(), 3);
        score.update_score(7);
        same(score.scores, [3, 7]);
        equal(score.total, 7);
        equal(score.roll_score(), 4);
        equal(score.frame_score(), 7);       
    });

    test("Testing the score object associated with the chord", function () {
        // create a known chord
        var chord = ChordModel.factory('A Maj');
        var score = chord.get_score();
        equal(score.scores.length, 0, 'Without any guesses made, the score array is empty');
        equal(score.total, 0, 'And the total score is zero to start with');
        equal(score.chord().pk, chord.pk, 'chord relationship is set correctly');
        var guess = ['A', 'C#'];
        chord.evaluate(guess);
        var score = chord.get_score();
        equal(score.scores.length, 1, '1 guess made so far');
        equal(score.frame_score(), 7, 'framescore so far = 7');
        equal(score.total, 7, 'and so is the total score (7)');
        var guess = ['A', 'C#', 'G'];
        chord.evaluate(guess);
        var score = chord.get_score();
        equal(score.scores.length, 2, '2 guess made so far');
        equal(score.frame_score(), 7, 'framescore still = 7');
        equal(score.total, 7, 'and so is the total score (7)');
    });

    test("Testing the case of strike", function () {
        // test 1 consecutive strike
        // create a known chord and guess correctly
        var chord0 = ChordModel.factory('A Maj');
        chord0.evaluate(['A', 'C#', 'E'])

        var score0 = chord0.get_score();
        ok(score0.is_strike(), "it's a strike!")
        ok(!score0.is_spare(), "it's not a spare!")
        equal(score0.total, 10, "test that it's a perfect 10");
        
        ok(!chord0.can_guess(), "cannot be guessed on chord0 anymore");

        var chord1 = ChordModel.factory('A Maj');
        chord1.evaluate(['A', 'C#']); // chord1 score becomes 7
        equal(score0.total, 17, "chord 0 score increased to 17");
        chord1.evaluate(['A', 'C#']); // chord1 score remains 7

        chord2 = ChordModel.factory('A Maj');
        chord2.evaluate(['A']); // chord2 score - 3 
        chord2.evaluate(['A', 'C#']);
        equal(score0.total, 17, "chord 0 score stays on 17");        

        // test 2 consecutive strikes - (chord3, chord4 strikes. test that
        // chord4 and chord5 score is added to  chord3,
        // chord5 score is added to chord4

        var chord3 = ChordModel.factory('A Maj');
        chord3.evaluate(['A', 'C#', 'E']);
        var score3 = chord3.get_score();
        equal(score3.total, 10, "Chord 3 score is perfect 10");
        var chord4 = ChordModel.factory('A Maj');
        chord4.evaluate(['A', 'C#', 'E']);
        var score4 = chord4.get_score();
        equal(score4.total, 10, "Chord 4 is also a perfect 10");
        var chord5 = ChordModel.factory('A Maj');
        chord5.evaluate(['A', 'E', 'C#']);
        var score5 = chord5.get_score();

        equal(score3.total, (10 + 10 + score5.total), "base score of chord4 and chord5 score is added to chord3");
        equal(score4.total, (10 + score5.total), "base score of chord5 is added to chord4");

        var chord6 = ChordModel.factory('A Maj');
        chord6.evaluate(['A']);
        
        equal(score3.total, (10 + 10 + 10));

    });

    test("Testing the case of spare", function () {
        var chord0 = ChordModel.factory('A Maj');
        chord0.evaluate(['A', 'C#'])
        chord0.evaluate(['A', 'C#', 'E'])

        var score0 = chord0.get_score();
        ok(score0.is_spare(), "it's a spare!")
        ok(!score0.is_strike(), "it's not a strike!")
        equal(score0.total, 10, "test that it's a perfect 10");

        var chord1 = ChordModel.factory('A Maj');
        chord1.evaluate(['A', 'C#']);

        var score1 = chord1.get_score();
        equal(score0.total, 10 + score1.total, "test that bonus of score1 is awarded");

        var score0_total = score0.total;
        
        chord1.evaluate(['A', 'E', 'C#']);
        equal(score0.total, score0_total, "score0 remains is not affected by the 2nd roll");
        
    });

    module("Testing the tenth frame", {
        // create 10 chord objects before each test
        setup: function () {
            var i = 0;
            while (i < 9) {
                c = ChordModel.factory('A Maj');
                c.evaluate(['A', 'E', 'C#']);
                this['chord'+(i++)] = c;
            }
        },
        // and destroy the collection after running it
        teardown: function () {
            ChordModel.destroyAll();
        }
    });

    test("Testing the case of strike in tenth frame", function () {
        var chord9 = this.chord9 = ChordModel.factory('A Maj');
        ok(chord9.is_last(), "In unattempted state chord 10 is last");
        this.chord9.evaluate(['A', 'E', 'C#']);

        ok(!chord9.is_last(), "But after scoring a strike, chord 10 is no longer the last chord");

        var chord8 = this.chord8;

        score9 = chord9.get_score();
        equal(score9.total, 10, "the score is 10");

        equal(chord8.get_score().total, 20, "the score is 10");

        chord10 = ChordModel.factory('A Maj');
        ok(chord10.is_last(), "In unattempted state chord 11 is last chord");
        equal(chord10.max_guesses(), 2, "the bonus chord has max guesses 2");
        chord10.evaluate(['A', 'E', 'C#']);
        ok(!chord10.is_last(), "In the event of a strike chord 11 is no longer last chord");
        score10 = chord10.get_score();

        equal(chord8.get_score().total, 30, "chord 10 score increase by bonus 10");
        equal(score9.total, 20, "chord 10 score increase by bonus 10");

        chord11 = ChordModel.factory('A Maj');
        ok(chord11.is_last(), "chord 12 is always last");
        equal(chord11.max_guesses(), 1, "the 2nd bonus chord has 1 max guess only");
        chord11.evaluate(['A', 'E', 'C#']);
        score11 = chord11.get_score();
        ok(chord11.is_last(), "chord 12 is always last");

        equal(score9.total, 30, "chord 10 score increase by bonus 10");

        // test that the total score is 300 which is maximum
        var total_score = 0;
        var i = 0;
        while (i < 10) {
            total_score += this['chord'+(i++)].get_score().total;
        }
        
        equal(total_score, 300, "the total score is 300 (maximum)");

    });    

    test("Testing the case of spare in the tenth frame", function () {
        var chord9 = this.chord9 = ChordModel.factory('A Maj');
        ok(this.chord9.is_last(), "In unattempted state chord 10 is last");
        this.chord9.evaluate(['A', 'E']);

        equal(this.chord9.get_score().total, 7, "Score is 7 so far");
        this.chord9.evaluate(['A', 'E', 'C#']);
        
        equal(this.chord9.get_score().total, 10, "Score is 10");
        ok(this.chord9.get_score().is_spare(), "..and it's a spare");
        ok(!this.chord9.is_last(), "In event of spare, chord 10 is no longer the last one");

        this.chord10 = ChordModel.factory('A Maj');
        ok(this.chord10.is_last(), "In unattempted state chord 11 is last");
        equal(this.chord10.max_guesses(), 1, "the bonus chord has 1 max guess only");
        this.chord10.evaluate(['A']);

        equal(this.chord10.get_score().total, 3, "Score is 3 so far for the bonus guess");
        equal(this.chord9.get_score().total, 13, "chord 10 score rises to 13");
        ok(this.chord10.is_last(), "In event other than a strike, chord 11 remains last chord");
    });

});

