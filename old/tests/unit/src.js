define(function (require) {
    
    var bdd = require('intern!bdd');
    require('../../fajita.js');
    require("../../node_modules/jquery/dist/jquery.js")
    var assert = require('intern/chai!assert');
    var expect = require('intern/chai!expect');

    var $sandbox = $("#sandbox");

    bdd.describe('src', function() {
        
        

        var BaseView = Fajita.View.extend({
            templateString:"<img nm-src='src'></img>",
            defaults:{
                src:"http://placehold.it/350x150"
            },
            tagName:"div"
        });

         bdd.it('should be able to display a default image', function () {
            
            var view = new BaseView();

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-src]").attr("src")).to.equal("http://placehold.it/350x150");

        });

        bdd.it('should change link tag on model change',function(){

            var app = new Fajita.Model({
                sourceysource:"http://placehold.it/200x200"
            })

            var view = new BaseView({
                model:app,
                templateValues:{
                    src:"sourceysource"
                }
            });
            $sandbox.append(view.el); 
            expect(view.$el.find("[nm-src]").attr("src")).to.equal("http://placehold.it/200x200");
            app.set({sourceysource:"http://placehold.it/150x150"})
            expect(view.$el.find("[nm-src]").attr("src")).to.equal("http://placehold.it/150x150");
        })

       
    })

})