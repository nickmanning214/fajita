define(function (require) {
    
    var bdd = require('intern!bdd');
    require('../../fajita.js');
    require("../../node_modules/jquery/dist/jquery.js")
    var assert = require('intern/chai!assert');
    var expect = require('intern/chai!expect');

    var $sandbox = $("<div id='sandbox'></div>");
    $("body").append($sandbox);

    

    bdd.describe('subview', function() {
        
        
        
        bdd.beforeEach(function () {
            $sandbox.empty();
        });

        


        bdd.it('should be able to do a subview thing', function () {
            
            var SubView = Fajita.View.extend({
                templateString:"<p nm-content='content'></p>",
                tagName:"div",
                defaults:{}
            });

            var BaseView = Fajita.View.extend({
                tagName:"ol",
                templateString:"<section nm-subview='Subview'></section>",
                defaults:{
                    Subview:{
                        content:"Here is content"
                    }
                },
                subViewImports:{
                    Subview:SubView
                }
            });

        

            var view = new BaseView

            expect(view.$el.find("p").html()).to.equal("Here is content");

            var app = new Fajita.Model({
                derp:"Derp!!!"
            })

            var view = new BaseView({
                model:app,
                templateValues:{
                    Subview:{
                        content:"derp"
                    }
                }
            });
        
            expect(view.$el.find("p").html()).to.equal("Derp!!!");


        })

    })
  
});