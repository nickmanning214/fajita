define(function (require) {
    
    var bdd = require('intern!bdd');
    require('../../fajita.js');
    require("../../node_modules/jquery/dist/jquery.js")
    var assert = require('intern/chai!assert');
    var expect = require('intern/chai!expect');
  

    

    bdd.describe('app', function () {

        var App = Fajita.Model.extend({});
        var app = new App();

        bdd.it('should be able to set and get a primitive value', function () {
            app.set({a:3});
            expect(app.get("a")).to.equal(3);
        });

        bdd.it('should be able to register a submodel', function () {
            //setup
            var a = 5;
            app.set("->testModel",{a:5});
            //Do not set it to attributes property.
            expect(app.attributes.testModel).to.be.undefined;
            expect(app.attributes["->testModel"]).to.be.undefined;
            
            //Make sure you got rid of the arrow
            expect(app.structure["->testModel"]).to.be.undefined;
            
            //testModel was set to the structure object
            expect(app.structure.testModel).to.be.instanceof(Fajita.Model);
            
            //And you can get it with "get"
            expect(app.get("->testModel")).to.be.instanceof(Fajita.Model);

        });

        bdd.it('should be able to register a subcollection', function () {
            //setup
            var app = new App();
            var a = 6
            app.set("->testCollection",[{a:6}]);
            //Do not set it to attributes property.
            expect(app.attributes.testCollection).to.be.undefined;
            expect(app.attributes["->testCollection"]).to.be.undefined;
            
            //Make sure you got rid of the arrow
            expect(app.structure["->testCollection"]).to.be.undefined;
            
            //testModel was set to the structure object
            expect(app.structure.testCollection).to.be.instanceof(Fajita.Collection);
            
            //And you can get it with "get"
            expect(app.get("->testCollection")).to.be.instanceof(Fajita.Collection);

        });

    });

  

  
});


/*
inside of describe you could also have:

 bdd.before(function () {
        
    });

    bdd.after(function () {
      // executes after suite ends
    });

    bdd.beforeEach(function () {
      // executes before each test
    });

    bdd.afterEach(function () {
      // executes after each test
    }); 
*/