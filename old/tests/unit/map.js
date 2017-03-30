define(function (require) {
    
    var bdd = require('intern!bdd');
    require('../../fajita.js');
    require("../../node_modules/jquery/dist/jquery.js")
    var assert = require('intern/chai!assert');
    var expect = require('intern/chai!expect');

    var $sandbox = $("<div id='sandbox'></div>");
    $("body").append($sandbox);

    

    bdd.describe('map', function() {
        
        
        
        bdd.beforeEach(function () {
            $sandbox.empty();
        });

        


        bdd.it('should be able to pass all of these tests', function () {
            
            var ItemView = Fajita.View.extend({
                templateString:"<p nm-content='content'></p>",
                tagName:"li",
                defaults:{}
            });

            var BaseView = Fajita.View.extend({
                tagName:"ol",
            templateString:"<li nm-map='items:Item'></li>",
            defaults:{
                items:new Fajita.Collection([
                    {name:"Nick"},
                    {name:"George"},
                    {name:"Bob"}
                ])
            },
            childViewImports:{
                Item:ItemView
            }
        });

        var app = new Fajita.Model;
        app.set("->people",[
            {name:"Clyde"},
            {name:"Roofus"},
            {name:"Timmy"}]
        );

        var view = new BaseView({
            model:app,
            templateValues:{
                items:"->people",
                Item:{
                    content:"name"
                }
            }
        });

        expect(view.$el.find("li>p").html()).to.equal("Clyde");

        //new test
        app.get("->people").add({name:"Bartholomew"});

        expect(view.$el.find("li>p").html()).to.equal("Clyde");

        //new test
        app.get("->people").comparator = "name";
        app.get("->people").add({name:"Carlos"});
        expect(view.$el.find("li>p").html()).to.equal("Bartholomew");

        })

    })
  
});