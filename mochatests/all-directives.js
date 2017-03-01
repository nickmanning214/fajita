describe("all-directives",function(){

   templateString = `
        <ul>
        <li nm-content='content'>
        <li>
            <button nm-enable='enable'>
                nm-enable='enable' (<span nm-content='enable'></span>)
            </button>
            <button nm-enable='dontenable'>
                nm-enable='dontenable' (<span nm-content='dontenable'></span>)
            </button>
            <button nm-disable='disable'>
                nm-disable='disable' (<span nm-content='disable'></span>)
            </button>
            <button nm-disable='dontdisable'>
                nm-disable='dontdisable' (<span nm-content='dontdisable'></span>)
            </button>
        <li>
            <a nm-href='href'>
                nm-href='href' (<span nm-content='href'></span>)
            </a>
            <i nm-href='href2'>
                nm-href='href2' (<span nm-content='href2'></span>)
            </i>
        <li>
            <img style='display:inline' nm-src='src' nm-content='src'></img>
            <span style='font-size:.5em' nm-content='src'></span>
        <li>
            <span nm-optional='optional'>
                nm-optional='optional' (<span nm-content='optional'></span>)
            </span>
            <span nm-optional='optional2'>
                nm-optional='optional2' (<span nm-content='optional2'></span>)
            </span>
            <div nm-optionalwrap='optionalwrap' style='background:yellow'><span>nm-optionalwrap='optionalwrap'</span><span nm-content='optionalwrap'></span></div>
            <div nm-optionalwrap='optionalwrap2' style='background:green'><span>nm-optionalwrap='optionalwrap2'</span><span nm-content='optionalwrap2'></span></div>
        <li>
            {{SubCollection:collection}}
        <li>
            {{SubView}}
        </ul>
    `;

    defaults = {
        content:"Default",
        enable:true,
        dontenable:false,
        disable:true,
        dontdisable:false,
        href:"http://www.google.com/",
        href2:"http://www.yahoo.com/",
        src:"http://www.placehold.it/50/ff0000",
        optional:true,
        optional2:false,
        optionalwrap:true,
        optionalwrap2:false,
        SubView:{
            content:"This is the default content for the subview (from the parent view)"
        },

        //error that this needs to be written twice.

        SubCollection:new Fajita.Collection([
            {a:1,b:2},
            {a:1,b:2},
            {a:1,b:2}
        ]),
        collection:new Fajita.Collection([
            {a:1,b:2},
            {a:1,b:2},
            {a:1,b:2}
        ])
    };
   
   
    MySubCollection = Fajita.View.extend({
        tagName:"div",//this doesn't appear
        templateString:"<span nm-content='what'></span>",
        defaults:{
            what:"Hello"
        }
    })

   MySubView = Fajita.View.extend({
        tagName:"subview",
        templateString:templateString.replace(/\{\{[^\}]+\}\}/g,""),
        defaults:_.extend({},defaults,{
            content:"This is the default content for the subview.",
            SubView:undefined
        })
    })

     HugeView = Fajita.View.extend({
            tagName:"div",
            className:"view",
            templateString:templateString,
            defaults:defaults,
            attributes:{
                style:"border-bottom:5px solid green;"
            },

            //The reason you need this is because defaults actually defines the defaults of the subview.
            //An advantage of this is that actually you want to fix subviews. You don't want them to be able to change.
            //If you add a variable subview functionality, that's for a later version.
            subViewImports:{
                SubView:MySubView
            },
            childViewImports:{
                SubCollection:MySubCollection
            }
        });
        
        defaultView = new HugeView;
        $sandbox.append(defaultView.el);
    it('should work with default values',function(){
       


        var directiveArrays = defaultView.directive; 
        _.each(directiveArrays,function(directiveArray){
            _.each(directiveArray,function(directiveInstance){
                if(!directiveInstance.test(defaultView.defaults[directiveInstance.val])) debugger;
                expect(directiveInstance.test(defaultView.defaults[directiveInstance.val])).to.be.true
            })
        });

      


    })
    it('should work with view.set',function(){
        newProps = {
            content:"View.set",
            enable:false,
            dontenable:true,
            disable:false,
            dontdisable:true,
            href:"http://www.gmail.com/",
            href2:"http://www.myspace.com/",
            src:"http://www.placehold.it/50/00ff00",
            optional:false,
            optional2:true,
            optionalwrap:false,
            optionalwrap2:true,
            SubView:{
                content:"This is the new content for the subview"
            }
        }

        viewSetView = new HugeView;
        $sandbox.append(viewSetView.el);

        viewSetView.set(newProps);

         var directiveArrays = _.omit(viewSetView.directive,"subview");
        _.each(directiveArrays,function(directiveArray){
            _.each(directiveArray,function(directiveInstance){
                expect(directiveInstance.test(newProps[directiveInstance.val])).to.be.true
            })
        });

    });
    it('should work with app passed in',function(){
        initialAppProps = {
            app_content:"App default",
            app_enable:false,
            app_dontenable:true,
            app_disable:false,
            app_dontdisable:true,
            app_href:"http://www.gmail.com/",
            app_href2:"http://www.myspace.com/",
            app_src:"http://www.placehold.it/50/0000ff",
            app_optional:false,
            app_optional2:true,
            app_optionalwrap:false,
            app_optionalwrap2:true
        };


        initialApp = new Fajita.Model(initialAppProps);
        appPassedView = new HugeView({
            model:initialApp,
            mappings:{
                content:"app_content",
                enable:"app_enable",
                dontenable:"app_dontenable",
                disable:"app_disable",
                dontdisable:"app_dontdisable",
                href:"app_href",
                href2:"app_href2",
                src:"app_src",
                optional:"app_optional",
                optional2:"app_optional2",
                optionalwrap:"app_optionalwrap",
                optionalwrap2:"app_optionalwrap2"
            }
        });
        $sandbox.append(appPassedView.el);
        var directiveArrays = _.omit(appPassedView.directive,"subview");
        _.each(directiveArrays,function(directiveArray){
            _.each(directiveArray,function(directiveInstance){
                expect(directiveInstance.test(initialAppProps["app_"+directiveInstance.val])).to.be.true
            })
        });
    });


    
    it('should work with app.set',function(){
        newAppProps = {
            app_content:"App.set",
            app_enable:!initialAppProps.app_enable,
            app_dontenable:!initialAppProps.app_dontenable,
            app_disable:!initialAppProps.app_disable,
            app_dontdisable:!initialAppProps.app_dontdisable,
            app_href:"http://www.reddit.com/",
            app_href2:"http://www.facebook.com/",
            app_src:"http://www.placehold.it/50/ffff00",
            app_optional:!initialAppProps.app_optional,
            app_optional2:!initialAppProps.app_optional2,
            app_optionalwrap:!initialAppProps.app_optionalwrap,
            app_optionalwrap2:!initialAppProps.app_optionalwrap2
        }
        newApp = new Fajita.Model(initialAppProps);
        newAppView = new HugeView({
            model:newApp,
            mappings:{
                content:"app_content",
                enable:"app_enable",
                dontenable:"app_dontenable",
                disable:"app_disable",
                dontdisable:"app_dontdisable",
                href:"app_href",
                href2:"app_href2",
                src:"app_src",
                optional:"app_optional",
                optional2:"app_optional2",
                optionalwrap:"app_optionalwrap",
                optionalwrap2:"app_optionalwrap2"
            }
        });
        $sandbox.append(newAppView.el);
        newApp.set(newAppProps);
       var directiveArrays = _.omit(newAppView.directive,"subview");
        _.each(directiveArrays,function(directiveArray){
            _.each(directiveArray,function(directiveInstance){
                expect(directiveInstance.test(newAppProps["app_"+directiveInstance.val])).to.be.true
            })
        });
    });

    it('should work with app.set (function)',function(){
       viewFunctions = new HugeView({
            model:initialApp,
            mappings:{
                content:function(){
                    return this.model.get("app_content")
                },
                enable:function(){
                    return this.model.get("app_enable")
                },
                dontenable:function(){
                    return this.model.get("app_dontenable")
                },
                disable:function(){
                    return this.model.get("app_disable")
                },
                dontdisable:function(){
                    return this.model.get("app_dontdisable")
                },
                href:function(){
                    return this.model.get("app_href")
                },
                href2:function(){
                    return this.model.get("app_href2")
                },
                src:function(){
                    return this.model.get("app_src")
                },
                optional:function(){
                    return this.model.get("app_optional")
                },
                optional2:function(){
                    return this.model.get("app_optional2")
                },
                optionalwrap:function(){
                    return this.model.get("app_optionalwrap")
                },
                optionalwrap2:function(){
                    return this.model.get("app_optionalwrap2")
                }
            }
        });
        $sandbox.append(viewFunctions.el);
       var directiveArrays = _.omit(viewFunctions.directive,"subview");
        _.each(directiveArrays,function(directiveArray){
            _.each(directiveArray,function(directiveInstance){
                expect(directiveInstance.test(viewFunctions.mappings[directiveInstance.val].call(viewFunctions))).to.be.true
            })
        });
    })
})