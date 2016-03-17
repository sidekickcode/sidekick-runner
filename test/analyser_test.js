var analyser = require("../src/analyser");
var jshint = require("sidekick-jshint");

describe('analyser', function() {

	describe('config', function() {

		before(function() {
			this.config = analyser.load(require("sidekick-jshint/config.json"));
		});

		it('turns interpreters and scripts into invocation', function() {
      assert.match(this.config.command, /\bnode\b/);
		})

		it('interpreter command contains script', function() {
			assert.match(this.config.command, /\bjshint\.js\b/);
		})

		
			
	})
		
})
