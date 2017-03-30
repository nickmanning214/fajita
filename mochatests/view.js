describe("NoDefaults = Fajita.View.extend({})", function() {
    
    var NoDefaults = Fajita.View.extend({});    
    var noDefaultsF = function(){new NoDefaults()};

    it("should require a defaults hash and a template",function(){
        try{
            noDefaultsF();
        }
        catch(errors){
            expect(_.includes(errors,"You need defaults for your view")).to.be.true;
            expect(_.includes(errors,"You need a template")).to.be.true;
        }
    });
});

describe(`HasDefaults = Fajita.View.extend({
    defaults:{
        text:"Hello"
    }
})`,function(){
    var HasDefaults = Fajita.View.extend({
        defaults:{
            text:"Hello"
        }
    });
})



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
