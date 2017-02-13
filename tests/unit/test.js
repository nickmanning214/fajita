define(function (require) {
  var bdd = require('intern!bdd');
  require('../../fajita.js');
  var Fajita = global.Fajita;
  var assert = require('intern/chai!assert');
  var expect = require('intern/chai!expect');
  
  
  var App = Fajita.Model.extend({});
  


  bdd.describe('app', function () {
   
    bdd.it('should be able to set and get a primitive value', function () {
        
        var app = new App();
        var a = Math.random();
        app.set({a:a});
        expect(app.get("a")).to.equal(a);

    });

    bdd.it('should be able to register a submodel', function () {
        //setup
        var app = new App();
        var a = Math.random();
        app.set("->testModel",{a:a});
        
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
        var a = Math.random();
        app.set("->testCollection",[{a:a}]);
        
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