describe("Fajita.View", function() {
    var BaseView = Fajita.View.extend({
        templateString: "Just a string",
        defaults: {}
    });

  
    it('should be able to be a view without a wrapper element', function() {
        var view = new BaseView();
        var div = document.createElement("div");
        $sandbox.append(div);
        div.appendChild(view.el);
        expect(div.childNodes[0].textContent).to.equal("Just a string")
    });

    var BaseView2 = Fajita.View.extend({
        //templateString: "<h1>Just {{Subview}}</h1><p>{{Subview:model}} {{ItemView:collection}}</p>",
        templateString:"<h1>Just {{Subview}}</h1>",
        defaults: {},
        subViewImports:{
            Subview:BaseView
        }
    });
    it('should be able to handle curly brace syntax',function(){

    })

    this.BaseView = BaseView2;
});