describe("Fajita.View.extend", function() {
    var BaseView = Fajita.View.extend({
        templateString: "Just a string",
        defaults: {}
    });

    /*
    This is problematic because you don't save a reference to the children when you append it (or maybe it was for some other reason)
    IIRC, it doesn't play nicely with nm-map.
    it('should be able to be a view without a wrapper element', function() {        
        view = new BaseView();
        var div = document.createElement("div");
        $sandbox.append(div);
        div.appendChild(view.el);
        expect(div.childNodes[0].textContent).to.equal("Just a string")
    });*/
})
