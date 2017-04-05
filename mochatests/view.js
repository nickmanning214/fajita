BaseView = Fajita.View.extend({
    warn: false
})

describe("Fajita.View", function() {

    describe("#get", function() {

        describe("from parent (or regular view)", function() {
            it("should retrieve a default value", function() {

                var View = BaseView.extend({
                    defaults: {
                        header: "This is a header"
                    }
                });


                var view = new View;


                expect(view.get("header")).to.equal("This is a header");

            });

            it("should retrieve an overridden default value", function() {

                var View = BaseView.extend({
                    defaults: {
                        header: "This is a header"
                    }
                });


                var view = new View({
                    defaultsOverride: {
                        header: "This is a header override"
                    }
                });


                expect(view.get("header")).to.equal("This is a header override");


            });

            it("should retrieve a template value (function)", function() {
                var View = BaseView.extend({
                    defaults: {
                        header: "This is a header"
                    }
                });


                var view = new View({
                    model: new Fajita.Model({
                        name: "Nick Manning"
                    }),
                    templateValues: {
                        header: function() {
                            return this.model.get("name");
                        }
                    }
                });


                expect(view.get("header")).to.equal("Nick Manning")
            });

            it("should retrieve a template value (string)", function() {
                var View = BaseView.extend({
                    defaults: {
                        header: "This is a header"
                    }
                });


                var view = new View({
                    model: new Fajita.Model({
                        name: "Nick Manning"
                    }),
                    templateValues: {
                        header: "name"
                    }
                });


                expect(view.get("header")).to.equal("Nick Manning");
            });

            it("Should get a subview", function() {
                var SubView = BaseView.extend({
                    defaults: {
                        content: "Here is the content"
                    }
                });
                var ViewWithSubView = BaseView.extend({
                    defaults: {
                        header: "This is a header"
                    },
                    subViewImports: {
                        subView: SubView
                    }
                });


                var view = new ViewWithSubView;
                window.v = view;
                expect(view.get("subView")).to.be.instanceof(SubView);
            });
        });
        describe("from subview", function() {
            it("Should get the defaults", function() {
                var SubView = BaseView.extend({
                    defaults: {
                        content: "Here is the content"
                    }
                });
                var ViewWithSubView = BaseView.extend({
                    defaults: {
                        header: "This is a header"
                    },
                    subViewImports: {
                        subView: SubView
                    }
                });


                var view = new ViewWithSubView;

                expect(view.get("subView").get("content")).to.equal("Here is the content")
            });

            it("Should get the defaults from the parent's defaults", function() {
                var SubView = BaseView.extend({
                    defaults: {
                        content: "Here is the content"
                    }
                });
                var ViewWithSubView = BaseView.extend({
                    defaults: {
                        header: "This is a header",
                        subView: {
                            content: "Here is the overridden content"
                        }
                    },
                    subViewImports: {
                        subView: SubView
                    }
                });


                var view = new ViewWithSubView;

                expect(view.get("subView").get("content")).to.equal("Here is the overridden content");
            });

            it("Should get the defaults from the parent's defaults (collection)", function() {
                var SubView = BaseView.extend({
                    defaults: {
                        content: "Here is the content"
                    }
                });
                var ViewWithMap = BaseView.extend({
                    defaults: {
                        subView: [{
                                content: "Here is the overridden content"
                            },
                            {}
                        ]
                    },
                    subViewImports: {
                        subView: SubView
                    }
                });


                view = new ViewWithMap;

                //Collections must have models, not views. Hence "get("view")". TODO: Get rid of this requirement.
                expect(view.get("subView").at(0).get("view").get("content")).to.equal("Here is the overridden content");
                expect(view.get("subView").at(1).get("view").get("content")).to.equal("Here is the content");
            })

            it("Should get a template value", function() {
                var SubView = BaseView.extend({
                    defaults: {
                        content: "Here is the content"
                    }
                });
                var ViewWithSubView = BaseView.extend({
                    defaults: {
                        header: "This is a header",
                        subView: {
                            content: "Here is the overridden content"
                        }
                    },
                    subViewImports: {
                        subView: SubView
                    }
                });




                var view = new ViewWithSubView({
                    model: new Fajita.Model({
                        someProperty: "some value"
                    }),
                    templateValues: {
                        subView: {
                            content: "someProperty"
                        }
                    }
                });
                expect(view.get("subView").get("content")).to.equal("some value");
            });
            it("nested subViews and defaults", function() {
                var Child3 = BaseView.extend({
                    defaults: {
                        content: "Here is child 3"
                    }
                });
                var Child2 = BaseView.extend({
                    defaults: {
                        content: "Here is child 2"
                    },
                    subViewImports: {
                        subView: Child3
                    }
                });
                var Child1 = BaseView.extend({
                    defaults: {
                        content: "Here is child 1"
                    },
                    subViewImports: {
                        subView: Child2
                    }
                });
                var ParentView = BaseView.extend({
                    defaults: {
                        content: "Here is the parent"
                    },
                    subViewImports: {
                        subView: Child1
                    }
                });

                var view = new ParentView;

                expect(view).to.be.instanceof(ParentView);
                expect(view.get("subView")).to.be.instanceof(Child1);
                expect(view.get("subView").get("subView")).to.be.instanceof(Child2);
                expect(view.get("subView").get("subView").get("subView")).to.be.instanceof(Child3);

                expect(view.get("content")).to.equal("Here is the parent");
                expect(view.get("subView").get("content")).to.equal("Here is child 1");
                expect(view.get("subView").get("subView").get("content")).to.equal("Here is child 2");
                expect(view.get("subView").get("subView").get("subView").get("content")).to.equal("Here is child 3");


            });
        });



    });

    describe("directives",function(){
        describe("#build",function(){
            describe("nm-content",function(){
                it("should have the content of the tag equal to the templateVariable",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<h1 nm-content='header'></h1>`,
                        tagName:"div",
                        defaults: {
                            header: "This is a header"
                        }
                    });


                    var view = new View;

                    expect(view.$el.find("[nm-content]").html()).to.equal(view.get("header"));
                })
            });
            describe("nm-href",function(){
                it("should build the template with the correct value",function(){
                    var View = BaseView.extend({
                        templateString:`<a nm-href='href'></a>`,
                        tagName:"div",
                        defaults: {
                            href: "http://www.google.com/"
                        }
                    });


                    var view = new View;
                    window.view = view;
                    expect(view.$el.find("[nm-href]").attr("href")).to.equal(view.get("href"));
                })

                it("should build the template with the correct value",function(){
                    var View = BaseView.extend({
                        templateString:`<h1 nm-href='href'></h1>`,
                        tagName:"div",
                        defaults: {
                            href: "http://www.google.com/"
                        }
                    });


                    var view = new View;
                    window.view = view;
                    expect(view.$el.find("[nm-href]").parent().attr("href")).to.equal(view.get("href"));
                })
            });
            describe("nm-src",function(){
                it("should have the src of the tag equal to the templateVariable",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<img nm-src='src'></h1>`,
                        tagName:"div",
                        defaults: {
                            src: "http://www.placehold.it/200x200"
                        }
                    });


                    var view = new View;

                    expect(view.$el.find("[nm-src]").attr("src")).to.equal(view.get("src"));
                })
            });
            describe("nm-enable",function(){
                it("should have the button enabled",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<button nm-enable='shouldEnable'></button>`,
                        tagName:"div",
                        defaults: {
                            shouldEnable: true
                        }
                    });


                    var view = new View;
                    window.v = view;
                    expect(view.$el.find("[nm-enable]").prop("disabled")).to.be.false;
                });
                 it("should have the button disabled",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<button nm-enable='shouldEnable'></button>`,
                        tagName:"div",
                        defaults: {
                            shouldEnable: false
                        }
                    });


                    var view = new View;
                    window.v = view;
                    expect(view.$el.find("[nm-enable]").prop("disabled")).to.be.true;
                });
            });
            describe("nm-disable",function(){
                it("should have the button disabled",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<button nm-disable='shouldDisable'></button>`,
                        tagName:"div",
                        defaults: {
                            shouldDisable: true
                        }
                    });


                    var view = new View;
                    window.v = view;
                    expect(view.$el.find("[nm-disable]").prop("disabled")).to.be.true;
                });
                 it("should have the button enabled",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<button nm-disable='shouldDisable'></button>`,
                        tagName:"div",
                        defaults: {
                            shouldDisable: false
                        }
                    });


                    var view = new View;
                    window.v = view;
                    expect(view.$el.find("[nm-disable]").prop("disabled")).to.be.false;
                });
            });
            describe("nm-optoinal",function(){
                it("should have the content of the tag equal to the templateVariable",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<h1 nm-optional='shouldShow'></h1>`,
                        tagName:"div",
                        defaults: {
                            shouldShow: true
                        }
                    });


                    var view = new View;
                    $("body").append(view.el)
                    expect(view.$el.find("[nm-optional]").is(":visible")).to.equal(view.get("shouldShow"));
                });
                it("should have the content of the tag equal to the templateVariable",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<h1 nm-optional='shouldShow'></h1>`,
                        tagName:"div",
                        defaults: {
                            shouldShow: false
                        }
                    });


                    var view = new View;
                    $("body").append(view.el)
                    expect(view.$el.find("[nm-optional]").is(":visible")).to.equal(view.get("shouldShow"));
                });
            });
            
        });
        describe("#render",function(){
            describe("nm-content",function(){
                it("should render the template with the correct value",function(){
                    var View = BaseView.extend({
                        templateString:`<h1 nm-content='header'></h1>`,
                        tagName:"div"
                    });


                    var view = new View;
                    view.set({"header":"New Thing"});

                    expect(view.$el.find("[nm-content]").html()).to.equal(view.get("header"));

                });
            });
            describe("nm-href",function(){
                it("should render the template with the correct value",function(){
                    var View = BaseView.extend({
                        templateString:`<a nm-href='href'></a>`,
                        tagName:"div"
                       
                    });


                    var view = new View;
                    view.set({"href":"http://www.example.com/"})
                    expect(view.$el.find("[nm-href]").attr("href")).to.equal(view.get("href"));
                })

                it("should render the template with the correct value",function(){
                    var View = BaseView.extend({
                        templateString:`<h1 nm-href='href'></h1>`,
                        tagName:"div"
                    });


                    var view = new View;
                    view.set({"href":"http://www.example.com/"})

                    expect(view.$el.find("[nm-href]").parent().attr("href")).to.equal(view.get("href"));
                })
            });
            describe("nm-src",function(){
                it("should have the src of the tag equal to the templateVariable",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<img nm-src='src'></h1>`,
                        tagName:"div"
                    });


                    var view = new View;
                    view.set("src","http://www.placehold.it/200x200")
                    expect(view.$el.find("[nm-src]").attr("src")).to.equal(view.get("src"));
                })
            });
            describe("nm-enable",function(){
                it("should have the button enabled",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<button nm-enable='shouldEnable'></button>`,
                        tagName:"div"
                    });


                    var view = new View;
                    view.set({shouldEnable:true});
                    expect(view.$el.find("[nm-enable]").prop("disabled")).to.be.false;
                });
                 it("should have the button disabled",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<button nm-enable='shouldEnable'></button>`,
                        tagName:"div"
                    });


                    var view = new View;
                    view.set({shouldEnable:false});
                    expect(view.$el.find("[nm-enable]").prop("disabled")).to.be.true;
                });
            })
            describe("nm-disable",function(){
                it("should have the button disabled",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<button nm-disable='shouldDisable'></button>`,
                        tagName:"div"
                    });


                    var view = new View;
                    view.set({shouldDisable:true});
                    expect(view.$el.find("[nm-disable]").prop("disabled")).to.be.true;
                });
                 it("should have the button enabled",function(){

                    //This seems like an incomplete test since it relies on trusting that the viewModel changed. But that's okay because we already tested that.

                    var View = BaseView.extend({
                        templateString:`<button nm-disable='shouldDisable'></button>`,
                        tagName:"div"
                    });


                    var view = new View;
                    view.set({shouldDisable:false});
                    expect(view.$el.find("[nm-disable]").prop("disabled")).to.be.false;
                });
            })
        });


    })



})