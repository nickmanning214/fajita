BaseView = Fajita.View.extend({
    warn:false
})

describe("Fajita.View",function(){

    

    describe("defaults",function(){
        
    
        
        it("should assign a default value to the view and be retrievable with view.get",function(){
            
            var View = BaseView.extend({
                defaults:{
                    header:"This is a header"
                }
            });


            var view = new View;
            
            
            expect(view.get("header")).to.equal("This is a header");
        
        });

        it("should be possible to override defaults with defaultsOverride option",function(){
            
            var View = BaseView.extend({
                defaults:{
                    header:"This is a header"
                }
            });
            
            
            var view = new View({
                defaultsOverride:{
                    header:"This is a header override"
                }
            });
            
            
            expect(view.get("header")).to.equal("This is a header override");
        });



    });

    describe("model + templateValues",function(){
         describe("the value is a function (`this` is the view)",function(){
            it("should assign a model value to the view and be retrievable with view.get",function(){
                
                var View = BaseView.extend({
                    defaults:{
                        header:"This is a header"
                    }
                });
                
                
                var view = new View({
                    model:new Fajita.Model({
                        name:"Nick Manning"
                    }),
                    templateValues:{
                        header:function(){
                            return this.model.get("name");
                        }
                    }
                });
                
                
                expect(view.get("header")).to.equal("Nick Manning")
            
            });
        });
        describe("the value is a string",function(){
            it("should assign a model value to the view and be retrievable with view.get",function(){
                
                var View = BaseView.extend({
                    defaults:{
                        header:"This is a header"
                    }
                });
                
                
                var view = new View({
                    model:new Fajita.Model({
                        name:"Nick Manning"
                    }),
                    templateValues:{
                        header:"name"
                    }
                });
                
                
                expect(view.get("header")).to.equal("Nick Manning")
            
            });
        });
        
    });
    describe("subviews",function(){
        
        describe("subview default",function(){
            
            it("Should have the subview's defaults",function(){
                
                var SubView = BaseView.extend({
                    defaults:{
                        content:"Here is the content"
                    }
                });
                var ViewWithSubView = BaseView.extend({
                    defaults:{
                        header:"This is a header"
                    },
                    subViewImports:{
                        subView:SubView
                    }
                });
            
            
                var view = new ViewWithSubView;
                
                
                expect(view.get("->subView").get("content")).to.equal("Here is the content")
            
            });
        });
        describe("subview default override",function(){
            it("Should have the overridde defaults",function(){
                
                var SubView = BaseView.extend({
                    defaults:{
                        content:"Here is the content"
                    }
                });
                var ViewWithSubView = BaseView.extend({
                    defaults:{
                        header:"This is a header",
                        subView:{
                            content:"Here is the overridden content"
                        }
                    },
                    subViewImports:{
                        subView:SubView
                    }
                });


                var view = new ViewWithSubView;
                
                
                expect(view.get("->subView").get("content")).to.equal("Here is the overridden content");
            
            });
        });
        describe("subview model + templateValues override",function(){
            it("Should have the overridde defaults",function(){
                var SubView = BaseView.extend({
                    defaults:{
                        content:"Here is the content"
                    }
                });
                var ViewWithSubView = BaseView.extend({
                    defaults:{
                        header:"This is a header",
                        subView:{
                            content:"Here is the overridden content"
                        }
                    },
                    subViewImports:{
                        subView:SubView
                    }
                });


                var view = new ViewWithSubView({
                    model:new Fajita.Model({
                        someProperty:"some value"
                    }),
                    templateValues:{
                        subView:{
                            content:"someProperty"
                        }
                    }
                });
                
                
                expect(view.get("->subView").get("content")).to.equal("some value");
            });
        });
        describe("mapping default",function(){
            it("Should have the subview's defaults",function(){
                
                var SubView = BaseView.extend({
                    defaults:{
                        content:"Here is the content"
                    }
                });
                var ViewWithMap = BaseView.extend({  
                    defaults:{
                        subView:[
                            {content:"Here is the overridden content"},
                            {}
                        ]
                    },              
                    subViewImports:{
                        subView:SubView
                    }
                });


                view = new ViewWithMap;


                expect(view.get("->subView").at(0).get("content")).to.equal("Here is the overridden content");
                expect(view.get("->subView").at(1).get("content")).to.equal("Here is the content");
            
            });
        })
        
    });
    
    
})