/*Are these not real tests? Lot of automation here*/ 

var assert = chai.assert;
var expect = chai.expect;
var $sandbox = $("#sandbox")

DefaultsView = Fajita.View.extend({
    tagName:"div",
    templateString:`
        <h1 nm-content='header'></h1>
        <p nm-optional='loggedin'>You are logged in!</p>
        <button nm-disable='loggedin'>Log in</button>
        <button nm-enable='loggedin'>Log out</button>
    `,
    defaults:{
        header:"Defaults View",
        email:"nickmanning214@gmail.com",
        loggedin:false,
        login:true
    },
    events:{
        "input keypress":function(){
            console.log("Hello")
        }
    }
});

defaultsView = new DefaultsView();
$sandbox.html(defaultsView.el);



describe("directive",function(){
    
    
    
    defaultsView.$el.find("[nm-content]").each(function(){
        var $el = $(this);
        var defaults = DefaultsView.prototype.defaults;



        describe("nm-content=\""+$el.attr("nm-content")+"\"",function(){
            it("should equal "+$el.attr("nm-content"),function(){
                expect($el.html()).to.equal(defaults[$el.attr("nm-content")])
            })
        });

    });

    defaultsView.$el.find("[nm-optional]").each(function(){
        var $el = $(this);
        var defaults = DefaultsView.prototype.defaults;
        
        describe("nm-optional=\""+$el.attr("nm-optional")+"\"",function(){
            
            
            it("should have visibility equaliing "+defaults[$el.attr("nm-optional")],function(){
                expect($el.is(":visible")).to.equal(defaults[$el.attr("nm-optional")])
            })
        });
    });

   





    describe("default values",function(){
        it("nm-content",function(){
            bigview.$el.find("[nm-content]").each(function(){
                var default_ = ToDoList.prototype.defaults[$(this).attr("nm-content")];
                expect($(this).html()).to.equal(default_)
            });
        })
        it("nm-optional",function(){
            bigview.$el.find("[nm-optional]").each(function(){
                var default_ = ToDoList.prototype.defaults[$(this).attr("nm-optional")];
                if (default_){
                    expect($(this).is(":visible")).to.be.true
                }else{
                    expect($(this).is(":visible")).to.not.be.true
                }
            });
        })
        it("nm-enable",function(){
            bigview.$el.find("[nm-enable]").each(function(){
                var default_ = ToDoList.prototype.defaults[$(this).attr("nm-enable")];
                if (default_) expect($(this).prop("disabled")).to.not.be.true;
                else expect($(this).prop("disabled")).to.be.true;
            });
        });
        it("nm-disable",function(){
            bigview.$el.find("[nm-disable]").each(function(){
                var default_ = ToDoList.prototype.defaults[$(this).attr("nm-disable")];
                if (default_) expect($(this).prop("disabled")).to.be.true;
                else expect($(this).prop("disabled")).to.not.be.true;
            });
        })

            
            



   

    })
})
