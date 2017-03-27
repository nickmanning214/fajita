describe('Fajita.Model', function() {

    var App = Fajita.Model.extend({});
    var app = new App();

    it('should be able to "set" and "get" a submodel using arrow syntax (to do: and maintain a flat attributes hash)', function() {
        //setup
        var a = 5;
        app.set("->testModel", {
            a: 5
        });
        //Do not set it to attributes property.
        expect(app.attributes.testModel).to.be.undefined;
        expect(app.attributes["->testModel"]).to.be.undefined;

        //Make sure you got rid of the arrow
        expect(app.structure["->testModel"]).to.be.undefined;

        //testModel was set to the structure object
        expect(app.structure.testModel).to.be.instanceof(Fajita.Model);

        //And you can get it with "get"
        expect(app.get("->testModel")).to.be.instanceof(Fajita.Model);

    });

    it('should be able to "set" and "get" a subcollection using arrow syntax (to do: and maintain a flat attributes hash)', function() {
        //setup
        var app = new App();
        var a = 6
        app.set("->testCollection", [{
            a: 6
        }]);
        //Do not set it to attributes property.
        expect(app.attributes.testCollection).to.be.undefined;
        expect(app.attributes["->testCollection"]).to.be.undefined;

        //Make sure you got rid of the arrow
        expect(app.structure["->testCollection"]).to.be.undefined;

        //testModel was set to the structure object
        expect(app.structure.testCollection).to.be.instanceof(Fajita.Collection);

        //And you can get it with "get"
        expect(app.get("->testCollection")).to.be.instanceof(Fajita.Collection);

    });

});