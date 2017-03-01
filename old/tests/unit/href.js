define(function (require) {
    
    var bdd = require('intern!bdd');
    require('../../fajita.js');
    require("../../node_modules/jquery/dist/jquery.js")
    var assert = require('intern/chai!assert');
    var expect = require('intern/chai!expect');

    var $sandbox = $("#sandbox");

    bdd.describe('href', function() {
        
        

        var BaseView = Fajita.View.extend({
            templateString:"<h1 nm-href='href'>Header Link</h1>",
            defaults:{
                href:"http://www.google.com/"
            },
            tagName:"div"
        });

         bdd.it('should be able to display an A tag', function () {
            
            var view = new BaseView();

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-href]").parent()[0].tagName).to.equal("A");

        });

        bdd.it('should change link tag on model change',function(){

            var app = new Fajita.Model({
                linkywink:"http://www.yahoo.com/"
            })

            var view = new BaseView({
                model:app,
                mappings:{
                    href:"linkywink"
                }
            });
            $sandbox.append(view.el); 
            expect(view.$el.find("[nm-href]").parent()[0].tagName).to.equal("A");
            expect(view.$el.find("[nm-href]").parent().prop("href")).to.equal("http://www.yahoo.com/");
            app.set({linkywink:"http://www.bing.com/"})
            expect(view.$el.find("[nm-href]").parent().prop("href")).to.equal("http://www.bing.com/");
        })

       
    })

})