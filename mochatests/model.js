describe('Fajita.Model', function() {

    var App = Fajita.Model.extend({});
    var app = new App;
    window.app = app;
        
        describe('#set',function(){
            describe('sub model',function(){

                    it("should be able to avoid populating the attributes hash when calling `set` with arrow syntax",function(){
                        app.set("->subModel", {a:5});
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
                describe('sub collection',function(){
                    it("should convert the object passed in to an instance of Fajita.Collection",function(){
                        app.set("->subCollection", [{a:5},{a:7},{a:6}]);
                        expect(app.structure.subCollection).to.be.instanceof(Fajita.Collection);
                    });
                });
            });
           

        

        describe('#get',function(){
            describe('sub model',function(){
                it("should be able to retrieve the subModel with get + arrow syntax",function(){
                    expect(app.get("->subModel")).to.be.instanceof(Fajita.Model);
                });
            });
            describe('sub collection',function(){
                it("should be able to retrieve the subCollection with get + arrow syntax",function(){
                    expect(app.get("->subCollection")).to.be.instanceof(Fajita.Collection);
                });
            });

            /*
            TODO
            describe('sub-sub model',function(){
                it("should be able to retrieve the subModel with get + arrow syntax",function(){
                    expect(app.get("->subModel")).to.be.instanceof(Fajita.Model);
                    expect(app.get("->subCollection")).to.be.instanceof(Fajita.Collection);
                });
            });*/
            
        });

        describe("#on('change')",function(){
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
                it("should trigger change event on app when sub-submodel is changed",function(){
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