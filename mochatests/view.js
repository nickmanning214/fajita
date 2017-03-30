describe("Fajita.View",function(){

    var View = Fajita.View.extend({
        defaults:{
            header:"This is a header"
        }
    });

    describe("defaults",function(){
        
       
        
        it("should assign a default value to the view and be retrievable with view.get",function(){
            var view = new View;
            expect(view.get("header")).to.equal("This is a header");
        });

        it("should be possible to override defaults with defaultsOverride option",function(){
            var view = new View({
                defaultsOverride:{
                    header:"This is a header override"
                }
            });
            expect(view.get("header")).to.equal("This is a header override");
        });



    });

    describe("model + mappings",function(){
        it("should assign a model value to the view and be retrievable with view.get",function(){
            var view = new View({
                model:new Fajita.Model({
                    name:"Nick Manning"
                }),
                mappings:{
                    header:"name"
                }
            });
            expect(view.get("header")).to.equal("Nick Manning")
        })
    })
    
})