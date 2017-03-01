define(function (require) {
    
    var bdd = require('intern!bdd');
    require('../../fajita.js');
    require("../../node_modules/jquery/dist/jquery.js")
    var assert = require('intern/chai!assert');
    var expect = require('intern/chai!expect');

    var $sandbox = $("#sandbox");

    bdd.describe('optional', function() {
        
        

        var BaseView = Fajita.View.extend({
            templateString:"<h1 nm-optional='show'>Show or hide</h1>",
            defaults:{
                show:true
            },
            tagName:"div"
        });

         bdd.it('should be able to display by default', function () {
            
            var view = new BaseView();

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-optional]").is(":visible")).to.be.true;

        })

        bdd.it('should be able to be hidden by default', function () {
            
            var View = BaseView.extend({
                defaults:{
                    show:false
                }
            })

            var view = new View();

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-optional]").is(":visible")).to.not.be.true;

        })
    })

})