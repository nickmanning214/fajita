define(function (require) {
    
    var bdd = require('intern!bdd');
    require('../../fajita.js');
    require("../../node_modules/jquery/dist/jquery.js")
    var assert = require('intern/chai!assert');
    var expect = require('intern/chai!expect');

    var $sandbox = $("<div id='sandbox'></div>");
    $("body").append($sandbox);

    

    bdd.describe('nm-content', function() {
        

        var BaseView = Fajita.View.extend({
            templateString:"<p nm-content='content'></p><button>Click</button>",
            defaults:{
                content:"Default content"
            },
            tagName:"div"
        });
        
        bdd.beforeEach(function () {
            $sandbox.empty();
        });

        


        bdd.it('should be able to display a default value', function () {
            
            var view = new BaseView();

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-content]").html()).to.equal("Default content");

        })

        bdd.it('should be able to display a mapped value', function() {
            

            var app = new Fajita.Model({
                prop:"app prop value"
            });

            var view = new BaseView({
                model:app,
                mappings:{
                    content:"prop"
                }
            });

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-content]").html()).to.equal("app prop value");

        });

        bdd.it('should be able to change app outside of the view and have it be reflected', function(){
            var View = BaseView.extend({
                events:{
                    "click button":function(e){
                        app.set({prop:"Content Changed"})
                        
                        //Maybe:
                        //app.toggle("prop","Click to change the content","Content Changed")
                    }
                }
            });

            var app = new Fajita.Model({
                prop:"Click to change the content"
            });

            var view = new View({
                model:app,
                mappings:{
                    content:"prop"
                }
            });

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-content]").html()).to.equal("Click to change the content");

            view.$el.find("button").click();

            expect(view.$el.find("[nm-content]").html()).to.equal("Content Changed");
        })

        bdd.it('deep model change',function(){
            
            var app = new Fajita.Model({
                prop:"Click to change the content"
            });

            var View = BaseView.extend({
                events:{
                    "click button":function(e){
                        app.get("->subModel").set({subProp:"Content Changed"})
                    }
                }
            });

            

            app.set("->subModel",{subProp:"Click to change the content"})

            var view = new View({
                model:app,
                mappings:{
                    content:function(){
                        return app.get("->subModel").get("subProp")
                    }
                }
            });

            $sandbox.append(view.el);

            expect(view.$el.find("[nm-content]").html()).to.equal("Click to change the content");

            view.$el.find("button").click();

            expect(view.$el.find("[nm-content]").html()).to.equal("Content Changed");
        })
    })
  
});