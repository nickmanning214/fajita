describe('Collection = Fajita.Collection.extend', function() {
    var Collection = Fajita.Collection.extend({})
    var collection = new Collection;
    describe('collection = new Collection',function(){
         
         beforeEach(function(){
            collection.changed = false;
            collection.on("update",function(){
                 this.changed = true;
            });
         })
         afterEach(function(){
             collection.off("update");
         })
         it("should trigger update event on collection when submodel is added",function(){
            expect(collection.changed).to.be.false;
            collection.add({b:9});
            expect(collection.changed).to.be.true;
        });
        it("should trigger update event on collection when submodel is changed",function(){
            expect(collection.changed).to.be.false;
            collection.at(0).set({b:5});
            expect(collection.changed).to.be.true;
        });
    })

})