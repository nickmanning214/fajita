describe('nm-content', function() {

    
    Content = Div.extend({
        templateString: "<p nm-content='content'></p><button>Click</button>",
        defaults: {
            content: "Default content"
        }
    });

    

    describe("default",function(){

        content = new Content;

        it('should be able to display a default value', function() {
            //expect(content.$el.find("[nm-content]").html()).to.equal("Default content");
            expect(content.directive.content[0].test("Default content")).to.be.true
        });
    })
    
    describe("view.set",function(){

        content2 = new Content;
        content2.set({"content":"New Content"});

        it('should be able to use view.set to change the dom',function(){
            expect(content2.$el.find("[nm-content]").html()).to.equal("New Content")
        })
    });

    describe("pass app/templateValues as option to view",function(){

        app = new Fajita.Model({name: "Nick"});
        content3 = new Content({
            model: app,
            templateValues: {
                content: "name"
            }
        });

        it('should display the correct value in nm-content',function(){
            expect(content3.$el.find("[nm-content]").html()).to.equal("Nick");
        });
    })

     describe("app.set",function(){
        app2 = new Fajita.Model({name: "Nick"});
        content4 = new Content({
            model: app2,
            templateValues: {
                content: "name"
            }
        });

        app2.set({name:"George"});

        it('should display the correct value in nm-content',function(){
            expect(content4.$el.find("[nm-content]").html()).to.equal("George");
        });
     })

     describe("app.set (with function)",function(){
        app3 = new Fajita.Model({name: "Nick"});
        content5 = new Content({
            model: app3,
            templateValues: {
                content: function(){
                    return this.model.get("name")+"!"
                }
            }
        });

        app3.set({name:"George"});
        it('should display the correct value in nm-content',function(){
            expect(content5.$el.find("[nm-content]").html()).to.equal("George!");
        });
    })

    describe('deep model change', function() {
        it('deep model change', function() {
        
            DeepView = Div.extend({
                templateString:"<p nm-content='content'></p>",
                defaults:{
                    content:"default content"
                }
            })
            
            //This tests whehter a subModel's nm-content displays correctly, mapped with a function.
            //Then it tests if you call .set on the subModel, does the view change?

            
            //Basically I think it's testing wether changing a submodel triggers a change on the model which should update the view
            
            var app = new Fajita.Model;
            app.set("->subModel", {
                subProp: "subModel's subProp"
            })

            var view = new DeepView({
                model: app,
                templateValues: {
                    content: function() {
                        return app.get("->subModel").get("subProp")
                    }
                }
            });


            expect(view.$el.find("[nm-content]").html()).to.equal("subModel's subProp");

            app.get("->subModel").set({
                subProp: "Content Changed"
            })

            expect(view.$el.find("[nm-content]").html()).to.equal("Content Changed");
        })
    })
   

    
});