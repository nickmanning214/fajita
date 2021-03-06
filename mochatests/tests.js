
function getSuite(title){
    return mocha.suite.suites.filter(suite=>{return suite.title===title})[0]
}

//Allow you to extend simple elements in tests.
Div = Fajita.View.extend({
    tagName: "div"
});

Menu = Fajita.View.extend({
    tagName: "menu"
});

MenuItem = Fajita.View.extend({
    tagName: "menuitem"
});






//Testing directives.

//1. Test if it displays by default
//2. Test if it changes by using view.set









describe('nm-optional', function() {


    //Example "hide by default". In general, hide. If error, show.
    ErrorBox = Div.extend({
        templateString:"<div nm-optional='isError'></div>",
        defaults: {
            isError: false
        }
    });

    //Example "show by default". In general, hide. If logged out, show.
    LoginScreen = Div.extend({
        templateString:"<div nm-optional='isLoggedOut'><input name='username'></input><input name='password'></input></div>",
        defaults:{
            isLoggedOut:true
        }
    })

    errorBox = new ErrorBox;
    loginScreen = new LoginScreen;

    it('should be able to display by default', function() {

        $sandbox.append(errorBox.el);
        expect(errorBox.$el.find("[nm-optional]").is(":visible")).to.not.be.true;

    })

    it('should be able to be hidden by default', function() {

        $sandbox.append(loginScreen.el);
        expect(loginScreen.$el.find("[nm-optional]").is(":visible")).to.be.true;

    })

    it('should be able to hide/show the values from view.set', function(){
        loginScreen.set({"isLoggedOut":false});
        errorBox.set({"isError":true});
        expect(loginScreen.$el.find("[nm-optional]").is(":visible")).to.not.be.true;
        expect(errorBox.$el.find("[nm-optional]").is(":visible")).to.be.true;

    })
})

describe('nm-optionalwrap', function() {

    Wrapped = Div.extend({
        templateString: "<section nm-optionalwrap='wrap'><div>Should this be wrapped?</div></section>",
        defaults: {
            wrap: true
        }
    });

    Unwrapped = Div.extend({
        templateString:"<section nm-optionalwrap='wrap'><div>Should this be wrapped?</div></section>",
        defaults:{
            wrap: false
        }
    })

    wrapped = new Wrapped;
    unwrapped = new Unwrapped;
    
    //right now first child has to be in dom
    $sandbox.append(wrapped.el);
    $sandbox.append(unwrapped.el);
    //right now first child has to be in dom

    it('should be able to be wrapped by default', function() {

        expect(wrapped.$el.find("[nm-optionalwrap]").length).to.equal(1);

    });

    it('should be able to be hidden by default', function() {

    
        expect(unwrapped.$el.find("[nm-optionalwrap]").length).to.equal(0);
        expect(unwrapped.el.children[0].innerHTML).to.equal("Should this be wrapped?");

    });

    it('should be able to be unwrapped',function(){
        wrapped.set({wrap:false});
        expect(wrapped.$el.find("[nm-optionalwrap]").length).to.equal(0);
    })
    it ('should be able to be wrapped',function(){

        unwrapped.set({wrap:true});
        expect(unwrapped.$el.find("[nm-optionalwrap]").length).to.equal(1);
    })
})

describe('nm-src', function() {

    DivImage = Div.extend({
        templateString: "<img nm-src='src'></img>",
        defaults: {
            src: "http://placehold.it/350x150"
        }
    });

    divImage = new DivImage

   

    it('should be able to display a default image', function() {

        expect(divImage.$el.find("[nm-src]").attr("src")).to.equal("http://placehold.it/350x150");

    });

    it('should be able to change src',function(){
        divImage.set({src:"http://placehold.it/200x200"})
        expect(divImage.$el.find("[nm-src]").attr("src")).to.equal("http://placehold.it/200x200");

    })

    return;

    it('should change link tag on model change', function() {

        var app = new Fajita.Model({
            sourceysource: "http://placehold.it/200x200"
        })

        var view = new BaseView({
            model: app,
            templateValues: {
                src: "sourceysource"
            }
        });
        $sandbox.append(view.el);
        expect(view.$el.find("[nm-src]").attr("src")).to.equal("http://placehold.it/200x200");
        app.set({
            sourceysource: "http://placehold.it/150x150"
        })
        expect(view.$el.find("[nm-src]").attr("src")).to.equal("http://placehold.it/150x150");
    })


})

describe('nm-subview', function() {

    MenuItemLink = MenuItem.extend({
        name:"MenuItemLink",
        templateString:"<a nm-href='linkhref' nm-content='linkname'></a>",
        defaults:{
            linkhref:"http://www.aol.com/",
            linkname:"AOL"
        }
    })


    MenuJustMenuItems = Menu.extend({
        name:"MenuJustMenuItems",
        templateString: "{{MenuItem:menuitems}}",
        defaults: {

            //This is supposed to override the defaults of the childview
            //The real defaults are overridden by options.data. Thus, you need 
            //each childview to pass options.data = each of these.
            //Turns out the problem was that it was merging a model with a JSON object, which doesn't mix.
            //Should defaults be collections/models? Hmmm...
            //You'd think they should be so that you can listen to them even without a model passed in.
          menuitems:new Fajita.Collection([
               {linkhref:"http://www.msn.com",linkname:"MSN"},
               {linkhref:"http://www.wikipedia.com",linkname:"Wikipedia"},
               {linkhref:"http://www.espn.com",linkname:"ESPN"}
           ])
        
    
        },
        childViewImports:{
            MenuItem:MenuItemLink
        }
    });

    MenuViewContent = Fajita.View.extend({
        name:"MenuViewContent",
        templateString: "<p nm-content='content'></p>",
        tagName: "menu",
        defaults: {
            content:"This should not appear when it's a subview"
        }
    });


    //Abstract Header View with a tagName, base templateString to be extended, and defaults to be extended.
    AbstractHeaderView = Fajita.View.extend({
        name:"AbstractHeaderView",
        tagName: "header",
        templateString:"<h1 nm-content='h1content'></h1> [[replace here]] <p nm-content='pcontent'></p><hr>",
        defaults: {
            h1content:"Put `h1` information here.",
            pcontent:"Put `p` information here."
        }
    })

    HeaderViewContent = AbstractHeaderView.extend({
        name:"HeaderViewContent",
        templateString:AbstractHeaderView.prototype.templateString.replace("[[replace here]]","{{Menu}}"),
        defaults: _.extend({},AbstractHeaderView.prototype.defaults,{
            Menu:{
                content: "Put `menu` content here."
            }
        }),
        subViewImports:{
            Menu:MenuViewContent
        }
    });


    AbstractHeaderViewContextObject = AbstractHeaderView.extend({
        name:"AbstractHeaderViewContextObject",
        templateString:AbstractHeaderView.prototype.templateString.replace("[[replace here]]","{{Menu:menu}}")
    })


    //I had an epiphany that if you pass a default model or collection to a view, 
    //there's no need to map it. Just have it's properties match the view properties.
    
    HeaderViewSubModel = AbstractHeaderViewContextObject.extend({
        name:"HeaderViewSubModel",
        defaults: _.extend({},AbstractHeaderViewContextObject.prototype.defaults,{
            menu:{
                content: "Put `menu` content here!!!"
            }
        }),
        subViewImports: {
            Menu: MenuViewContent
        }
    });
    
    HeaderViewSubCollection = HeaderViewSubModel.extend({
        name:"HeaderViewSubCollection",
        defaults: _.extend({},HeaderViewSubModel.prototype.defaults,{
            menu:[
               {linkhref:"http://www.something.com",linkname:"Something"},
               {linkhref:"http://www.inc.com",linkname:"Inc"}
           ]
        }),
        subViewImports: {
            Menu: MenuJustMenuItems
        }
    });

    menuItemLink = new MenuItemLink;
    menuJustMenuItems = new MenuJustMenuItems;
    menuViewContent = new MenuViewContent;
    headerViewContent = new HeaderViewContent;
    headerViewSubModel = new HeaderViewSubModel;
    headerViewSubCollection = new HeaderViewSubCollection;
    



    


    it('should be able to override the subview\'s default nm-content', function() {

        
        expect(menuViewContent.$el.find("p").html()).to.equal("This should not appear when it's a subview");
        expect(headerViewContent.$el.find("menu p").html()).to.equal("Put `menu` content here.");
    
    });

    it('should be able to show a view with a default collection',function(){
        expect(menuItemLink.$el.find("a").html()).to.equal("AOL");
        expect(menuJustMenuItems.$el.find("a").html()).to.equal("MSN");
    });

    return;

    it('should be able to override default values with app values', function() {

        
       
        var site = new Fajita.Model({
            menuContent: "Link 1 Link 2 Link 3"
        });

        var view = new HeaderViewContent({
            model: site,
            templateValues: {
                Menu: {
                    content: "menuContent"
                }
            }
        });

        //Note: Comment out "templateValues" and behavior changes. Might be onto something there.

        window.view = view;

        $sandbox.append(view.el);
        expect(view.$el.find("p").html()).to.equal("Link 1 Link 2 Link 3");

    });

    it('should be able to have a context object in the subview',function(){
        

        var site = new Fajita.Model;
        site.set("->menu",{links:"Link 1 Link 2 Link 3 Link 4"});

        var view = new HeaderViewSubModel({
            model: site,
            templateValues: {
                menu:"->menu",
                Menu: { //imagine syntax like "Menu:submodel":{}
                    content: "links"
                }
            }
        });
        $sandbox.append(view.el);
        expect(view.$el.find("p").html()).to.equal("Link 1 Link 2 Link 3 Link 4");
    });

    

    it('should be able to have pass a collection to the subview',function(){
        


        
        var site = new Fajita.Model;
        var menu = new Fajita.Model;
        var menuItems = new Fajita.Collection([
            {name:"Google",href:"http://www.google.com/"},
            {name:"Yahoo",href:"http://www.yahoo.com/"},
            {name:"Ask <del>Jeeves</del>",href:"http://www.ask.com/"}
        ]);
        menu.set("->menu",menuItems)
        site.set("->menu",menu);

       

        var view = new HeaderViewSubCollection({
            model: site,
            templateValues: {
                menu:"->menu",
                Menu: {
                    content: "name"
                }
            }
        });
        $sandbox.append(view.el);
        window.view = view;
        //expect(view.$el.find("p").html()).to.equal("Nick");
        
    })

})
/*
describe('nm-map', function() {
    return;


    var ItemView = Fajita.View.extend({
        templateString: "<p nm-content='content'></p>",
        tagName: "li",
        defaults: {}
    });

    var BaseView = Fajita.View.extend({
        tagName: "ol",
        templateString: "<li nm-map='items:Item'></li>",
        defaults: {
            items: new Fajita.Collection([{
                    name: "Nick"
                },
                {
                    name: "George"
                },
                {
                    name: "Bob"
                }
            ])
        },
        templateValues: {
            Item: {
                content: "name"
            }
        },
        childViewImports: {
            Item: ItemView
        }
    });

    var viewWithoutModel = new BaseView;
    it('should be able to do a default view', function() {
        expect(viewWithoutModel.$el.find("li>p").eq(0).html()).to.equal("Nick");
        expect(viewWithoutModel.$el.find("li>p").eq(1).html()).to.equal("George");
        expect(viewWithoutModel.$el.find("li>p").eq(2).html()).to.equal("Bob");
    })

    var app = new Fajita.Model;
    app.set("->people", [{
            name: "Clyde"
        },
        {
            name: "Roofus"
        },
        {
            name: "Timmy"
        }
    ]);

    var view = new BaseView({
        model: app,
        templateValues: {
            items: "->people",
            Item: {
                content: "name"
            }
        }
    });
    it('should be able to do a model', function() {
        expect(view.$el.find("li>p").eq(0).html()).to.equal("Clyde");
        expect(view.$el.find("li>p").eq(1).html()).to.equal("Roofus");
        expect(view.$el.find("li>p").eq(2).html()).to.equal("Timmy");
    })

    it('should be able to add a model to the collection', function() {
        app.get("->people").add({
            name: "Bartholomew"
        });
        expect(view.$el.find("li>p").eq(0).html()).to.equal("Clyde");
        expect(view.$el.find("li>p").eq(1).html()).to.equal("Roofus");
        expect(view.$el.find("li>p").eq(2).html()).to.equal("Timmy");
        expect(view.$el.find("li>p").eq(3).html()).to.equal("Bartholomew");

    })

    it('should be able to sort based on a comparator', function() {

        app.get("->people").comparator = "name";
        app.get("->people").add({
            name: "Carlos"
        });
        expect(view.$el.find("li>p").eq(0).html()).to.equal("Bartholomew");
        expect(view.$el.find("li>p").eq(1).html()).to.equal("Carlos");
        expect(view.$el.find("li>p").eq(2).html()).to.equal("Clyde");
        expect(view.$el.find("li>p").eq(3).html()).to.equal("Roofus");
        expect(view.$el.find("li>p").eq(4).html()).to.equal("Timmy");


    });

   



    it('should be able to map views that are docfrags', function(){
        var DtDd = Fajita.View.extend({
            templateString:"<dt nm-content='definition'></dt><dd nm-content='description'></dd>",
            defaults:{
                definition:"This is a definition",
                description:"This is a description"
            }
        })

        var Dl = Fajita.View.extend({
            templateString:"<div nm-map='items:Item'></div>",
            defaults:{
                items:new Fajita.Collection([
                    {"definition":"word","description":"description"},
                    {"definition":"word2","description":"description2"}
                ])
            },
            childViewImports:{
                Item:DtDd
            }
        });
        var dl = new Dl();
        $sandbox.html(dl.el);
        expect($sandbox.find("dt").eq(0).parent().prop("tagName")).to.equal("DL")
    })

})*/
describe('nm-data', function() {
    it('should be able to set a default data value', function() {
        var BaseView = Fajita.View.extend({
            tagName: "section",
            templateString: "<p nm-data='pdata'></p>",
            defaults: {
                pdata: {
                    hello: function() {
                        return "Goodbye"
                    }
                }
            }
        })
        var view = new BaseView();
        window.v = view;
        expect(view.$el.find("[data-hello]").attr("data-hello")).to.equal("Goodbye");
        //Here you need to test for the problem you're having on the Arabic site dummy page.
        //Adding to a subcollection should fire update context object to work.
    })
});





/*
var DtDd = Fajita.View.extend({
    templateString:"<dt nm-content='definition'></dt><dd nm-content='description'></dd>",
    defaults:{
        definition:"This is a definition",
        description:"This is a description"
    }
})
var Dl = Fajita.View.extend({
    templateString:"<div nm-map='items:Item'></div>",
    defaults:{
        items:new Fajita.Collection([
            {"definition":"word","description":"description"},
            {"definition":"word2","description":"description2"}
        ])
    },
    childViewImports:{
        Item:DtDd
    }
});
var dl = new Dl();
//$sandbox.html(dl.el);
*/




