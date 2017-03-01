define(function (require) {
  var bdd = require('intern!bdd');
  //require('../../fajita.js');
  //var Fajita = global.Fajita;
  var assert = require('intern/chai!assert');
  var expect = require('intern/chai!expect');
  
  

  

  bdd.describe('app', function () {

    //var App = Fajita.Model.extend({});
   
    bdd.it('should display the page', function () {
        
       return this.remote.get(require.toUrl('file:///Users/Man/code/fajita/index.html'))
						.sleep(5000)
            .findById('main')
            .getVisibleText()
            .then(function(text){
              assert.ok(text=="How is it going bro?"?true:false);
          })
    });

  
  
});})


