function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


describe("simple map with defaults",function(){

    SimpleParagraphView = Fajita.View.extend({
        tagName:"p",/*error:this is required*/ 
        defaults:{
            value:'This is the value when it is not a subview'
        },
        templateString:`<span nm-content='value'></span>`
    });

   

    PageHasParagraphsView = Fajita.View.extend({
        tagName:"div",/*error:this is required (2)*/ 
        templateString:`
            <h1>PageHasParagraphsView</h1>
            {{Paragraph:paragraphs}}
        `,
        defaults:{

            /*Is this really how it should be named?*/ 
            Paragraph:new Fajita.Collection([
                {value:"This is a paragraph"},
                {value:"This is a paragraph"},
                {value:"This is a paragraph"},
                {value:"This is a paragraph"}
            ])
        },
        childViewImports:{
            Paragraph:SimpleParagraphView
        }
    });

    pageHasParagraphs = new PageHasParagraphsView;

    it("should have multiple paragraphs",function(){
        expect(pageHasParagraphs.$el.find("p").length).to.equal(4);
        expect(pageHasParagraphs.$el.find("p span").eq(0).html()).to.equal("This is a paragraph");
        expect(pageHasParagraphs.$el.find("p span").eq(1).html()).to.equal("This is a paragraph");
        expect(pageHasParagraphs.$el.find("p span").eq(2).html()).to.equal("This is a paragraph");
        expect(pageHasParagraphs.$el.find("p span").eq(3).html()).to.equal("This is a paragraph");
    });

})

describe('map inside of map',function(){
  
    SimpleWordView = Fajita.View.extend({
        tagName:"span",
        className:"word",
        templateString:`<span nm-content='value'></span>`,
        defaults:{
            value:"the"
        }
    });

    ParagraphHasWordsView = Fajita.View.extend({
        tagName:"p",
        templateString:`{{Word:words}}`,
        defaults:{
            Word:new Fajita.Collection([
                {value:"what"},
                {value:"what"},
                {value:"what"},
                {value:"what"}
            ])
        },
        childViewImports:{
            Word:SimpleWordView
        }
    });

 

    PageHasParagraphsHasWordsView = Fajita.View.extend({
        tagName:"div",
        templateString:`
            <h1>PageHasParagraphsHasWordsView</h1>
            {{Paragraph:paragraphs}}
        `,
        defaults:{
            Paragraph:new Fajita.Collection([
                {
                    Word:new Fajita.Collection([
                        {value:"Hello"},
                        {value:"Hello"},
                        {value:"Hello"}
                    ])
                },
                {
                    Word:new Fajita.Collection([
                        {value:"Hi"},
                        {value:"What's"},
                        {value:"Up"}
                    ])
                }
            ])
        },
        childViewImports:{
            Paragraph:ParagraphHasWordsView
        }
    });

    pageHasParagraphsHasWordsView = new PageHasParagraphsHasWordsView;

     it("should have multiple paragraphs",function(){

        //structure

        expect(pageHasParagraphsHasWordsView.$el.find("p").length).to.equal(2);
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[0]).to.be.an.instanceof(ParagraphHasWordsView);
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[0].directive.map[0].childViews[0]).to.be.an.instanceof(SimpleWordView);

        //overrides

        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[0].overrideSubviewDefaultsHash.Word.at(0).get("value")).to.equal("Hello")
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[0].overrideSubviewDefaultsHash.Word.at(1).get("value")).to.equal("Hello")
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[0].overrideSubviewDefaultsHash.Word.at(2).get("value")).to.equal("Hello")
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[1].overrideSubviewDefaultsHash.Word.at(0).get("value")).to.equal("Hi")
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[1].overrideSubviewDefaultsHash.Word.at(1).get("value")).to.equal("What's")
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[1].overrideSubviewDefaultsHash.Word.at(2).get("value")).to.equal("Up")
        
        //models
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[0].directive.map[0].childViews[0].get("value")).to.equal("Hello");
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[0].directive.map[0].childViews[1].get("value")).to.equal("Hello");
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[0].directive.map[0].childViews[2].get("value")).to.equal("Hello");
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[1].directive.map[0].childViews[0].get("value")).to.equal("Hi");
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[1].directive.map[0].childViews[1].get("value")).to.equal("What's");
        expect(pageHasParagraphsHasWordsView.directive.map[0].childViews[1].directive.map[0].childViews[2].get("value")).to.equal("Up");
        
        
    });

});

describe('map inside of map inside of map',function(){
    SimpleLetterView = Fajita.View.extend({
        tagName:"span",
        className:"letter",
        templateString:`<span nm-content='value'></span>`,
        defaults:{
            value:"j"
        }
    });

    WordHasLetterView = Fajita.View.extend({
        tagName:"span",
        className:"word",
        templateString:`{{Letter:letters}}`,
        defaults:{
            Letter:new Fajita.Collection([{value:"x"}])
        },
        childViewImports:{
            Letter:SimpleLetterView
        }
    });

    ParagraphHasWordHasLetterView = Fajita.View.extend({
        tagName:"p",
        className:"paragraph",
        templateString:`{{Word:words}}`,
        defaults:{
            Word:new Fajita.Collection([
                {
                    Letter:new Fajita.Collection([
                        {value:"k"},
                        {value:"l"},
                        {value:"m"}
                    ])
                },
                {
                    Letter:new Fajita.Collection([
                        {value:"n"},
                        {value:"o"},
                        {value:"p"}
                    ])
                }
            ])
        },
        childViewImports:{
            Word:WordHasLetterView
        }
    });

    PageHasParagraphHasWordHasLetterView = Fajita.View.extend({
        tagName:"div",
        templateString:`
            <h1>PageHasParagraphHasWordHasLetterView</h1>
            {{Paragraph:paragraphs}}
        `,
        defaults:{
            Paragraph:new Fajita.Collection([
                {
                    Word:new Fajita.Collection([
                        {
                            Letter:new Fajita.Collection([
                                {value:"H"},
                                {value:"e"},
                                {value:"l"},
                                {value:"l"},
                                {value:"o"}
                            ])
                        },
                        {
                            Letter:new Fajita.Collection([
                                {value:"G"},
                                {value:"o"},
                                {value:"o"},
                                {value:"d"},
                                {value:"b"},
                                {value:"y"},
                                {value:"e"}
                            ])
                        }
                    ])
                },
                {
                    Word:new Fajita.Collection([
                        {
                            Letter:new Fajita.Collection([
                                {value:"H"},
                                {value:"e"},
                                {value:"l"},
                                {value:"l"},
                                {value:"o"}
                            ])
                        }
                    ])
                }
            ])
        },
        childViewImports:{
            Paragraph:ParagraphHasWordHasLetterView
        }
    });

    pageHasParagraphHasWordHasLetterView = new PageHasParagraphHasWordHasLetterView;

    it("should work",function(){

    })



});


$("#sandbox").append(pageHasParagraphs.el);
$("#sandbox").append(pageHasParagraphsHasWordsView.el);
$("#sandbox").append(pageHasParagraphHasWordHasLetterView.el);

$(".word").each(function(){
    $(this).css("marginRight","10px")
})
$(".letter").each(function(){
    $(this).css("color",getRandomColor())
})