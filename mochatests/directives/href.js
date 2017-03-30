describe('nm-href', function() {


    it('default',function(){})
    it('view.set',function(){})
    it('pass app/templateValues as option to view',function(){})
    it('app.set',function(){})
    it('app.set (with function)',function(){})

    
    GoogleLink = Div.extend({
        templateString:"<[tagName] nm-href='href'>Google</[tagName]>",
        defaults: {
            href: "http://www.google.com/"
        }
    })

    H1Link = GoogleLink.extend({
        templateString: GoogleLink.prototype.templateString.replace(/\[tagName\]/g,"h1")
    });

    RegularLink = GoogleLink.extend({
        templateString: GoogleLink.prototype.templateString.replace(/\[tagName\]/g,"a")
    })

    h1Link = new H1Link;
    regularLink = new RegularLink;


    it('should be able to wrap a tag with an a tag by default', function() {

        expect(h1Link.el.tagName).to.equal("DIV");
        expect(h1Link.el.children.length).to.equal(1);
        expect(h1Link.el.children[0].tagName).to.equal("A");
        expect(h1Link.el.children[0].children.length).to.equal(1);
        expect(h1Link.el.children[0].children[0].tagName).to.equal("H1");

    });

    it('should be able to wrap have a regular a tag too', function() {

        expect(regularLink.el.tagName).to.equal("DIV");
        expect(regularLink.el.children.length).to.equal(1);
        expect(regularLink.el.children[0].tagName).to.equal("A");
        expect(regularLink.el.children[0].children.length).to.equal(0);

    });

    it('should be able to use view.set to change the href',function(){
        regularLink.set({href:"http://www.facebook.com/"});
        expect(regularLink.el.children[0].href).to.equal("http://www.facebook.com/")

        h1Link.set({href:"http://www.reddit.com/"});
        expect(h1Link.el.children[0].href).to.equal("http://www.reddit.com/")
    })

    return;

    it('should change link tag on model change', function() {

        var app = new Fajita.Model({
            linkywink: "http://www.yahoo.com/"
        })

        var view = new H1Link({
            model: app,
            templateValues: {
                href: "linkywink"
            }
        });
        $sandbox.append(view.el);
        expect(view.$el.find("[nm-href]").parent()[0].tagName).to.equal("A");
        expect(view.$el.find("[nm-href]").parent().prop("href")).to.equal("http://www.yahoo.com/");
        app.set({
            linkywink: "http://www.bing.com/"
        })
        expect(view.$el.find("[nm-href]").parent().prop("href")).to.equal("http://www.bing.com/");
    })


})