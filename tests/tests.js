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
        equals(this.chord0.pk, 0, 'The models collection is zero indexed')
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
    
});
