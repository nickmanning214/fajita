define(function (require) {
    
    var bdd = require('intern!bdd');
    require('../../fajita.js');
    require("../../node_modules/jquery/dist/jquery.js")
    var assert = require('intern/chai!assert');
    var expect = require('intern/chai!expect');

    var $sandbox = $("#sandbox");

    bdd.describe('enable', function() {
        
        

        var BaseView = Fajita.View.extend({
            templateString:"<button nm-enable='buttonEnable'>Click</button>",
            defaults:{
                buttonEnable:true
            },
            tagName:"div"
        });

         bdd.it('should be able to display enabled by default', function () {
            
            var view = new BaseView();

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-enable]")[0].disabled).to.not.be.true;

        })

        bdd.it('should be able to display disabled by default', function () {
            
            var View = BaseView.extend({
                defaults:{
                    buttonEnable:false
                }
            })

            var view = new View();

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-enable]")[0].disabled).to.be.true;

        })
    })

})