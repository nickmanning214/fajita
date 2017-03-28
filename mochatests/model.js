describe('App = Fajita.Model', function() {

    var App = Fajita.Model.extend({});
    
    describe('app = new App',function(){

        var app = new App;
        window.app = app;

        
        describe('app.set("->subModel",obj)',function(){
            
            var obj = {
                a:5
            };
            app.set("->subModel", obj);

            it("should be able to avoid populating the attributes hash when calling `set` with arrow syntax",function(){
                expect(app.attributes.subModel).to.be.undefined;
                expect(app.attributes["->subModel"]).to.be.undefined;

            });

            it("should rather assign the property to the structure hash without including the arrow in the property name",function(){
                expect(app.structure["->subModel"]).to.be.undefined;
                expect(app.structure.subModel).to.not.be.undefined;
            });
            it("should convert the object passed in to an instance of Fajita.Model",function(){
                expect(app.structure.subModel).to.be.instanceof(Fajita.Model);
            })

        });

        describe('app.set("->subCollection",arr)',function(){
            var arr = [{a:5},{a:7},{a:6}];
            app.set("->subCollection", arr);
            it("should convert the object passed in to an instance of Fajita.Collection",function(){
                expect(app.structure.subCollection).to.be.instanceof(Fajita.Collection);
            })
        });

        describe('app.get',function(){
            describe('Get a submodel with app.get("->subModel")',function(){
                it("should be able to retrieve the subModel with get + arrow syntax",function(){
                    expect(app.get("->subModel")).to.be.instanceof(Fajita.Model);
                    expect(app.get("->subCollection")).to.be.instanceof(Fajita.Collection);
                });
            });
            describe('Get a subsubmodel with app.get("->subModel->subSubModel")',function(){
                it("should be able to retrieve the subModel with get + arrow syntax",function(){
                    expect(app.get("->subModel")).to.be.instanceof(Fajita.Model);
                    expect(app.get("->subCollection")).to.be.instanceof(Fajita.Collection);
                });
            });
            
        });

        describe("triggering change event when change is made to an object in the structure of the model",function(){
            beforeEach(function(){
                app.set({changed:false});
                app.on("change",function(){
                    app.set({changed:true})
                });
            });
            afterEach(function(){
                app.off("change");
            })
            describe("subModel change",function(){
                it("should trigger change event on app when submodel is changed",function(){
                    app.get("->subModel").set({a:6});
                    expect(app.get("changed")).to.be.true;
                });
            });

            describe("subSubModel change",function(){
                it("should trigger change event on app when submodel is changed",function(){
                    app.get("->subModel").set("->subSubModel",{b:7});
                    app.get("->subModel->subSubModel").set({b:8})
                    expect(app.get("changed")).to.be.true;
                });
            });

            describe("subCollection change",function(){
                it("should trigger change event on app when subcollection is changed",function(){
                    app.get("->subCollection").add([{a:9}]);
                    expect(app.get("changed")).to.be.true;
                });
            });
        });
    });

    
   

    


   

});