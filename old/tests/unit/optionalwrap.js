define(function (require) {
    
    var bdd = require('intern!bdd');
    require('../../fajita.js');
    require("../../node_modules/jquery/dist/jquery.js")
    var assert = require('intern/chai!assert');
    var expect = require('intern/chai!expect');

    var $sandbox = $("#sandbox");

    bdd.describe('optionalwrap', function() {
        
        

        var BaseView = Fajita.View.extend({
            templateString:"<section nm-optionalwrap='wrap'><div>Should this be wrapped?</div></section>",
            defaults:{
                wrap:true
            },
            tagName:"div"
        });

         bdd.it('should be able to be wrapped by default', function () {
            
            var view = new BaseView();

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-optionalwrap]").length).to.equal(1);

        })

        bdd.it('should be able to be hidden by default', function () {
            
            var View = BaseView.extend({
                defaults:{
                    wrap:false
                }
            })

            var view = new View();

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-optionalwrap]").length).to.equal(0);

        })
    })

})