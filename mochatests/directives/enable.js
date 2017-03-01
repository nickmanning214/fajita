


describe('nm-enable', function() {

    

    Button = Fajita.View.extend({
        templateString: "<button nm-enable='buttonEnable'>Click</button>",
        tagName: "div"
    });

    ButtonEnabled = Button.extend({
        defaults: {
            buttonEnable: true
        }
    });

    ButtonDisabled = Button.extend({
        defaults: {
            buttonEnable: false
        }
    });

    

    describe("default",function(){

        buttonEnabled = new ButtonEnabled;
        buttonDisabled = new ButtonDisabled;

        it('should be able to display enabled by default', function() {
            expect(buttonEnabled.$el.find("[nm-enable]")[0].disabled).to.not.be.true;
        });
        it('should be able to display disabled by default', function() {
            expect(buttonDisabled.$el.find("[nm-enable]")[0].disabled).to.be.true;
        });
    })

    describe("view.set",function(){
        buttonEnabled2 = new ButtonEnabled;
        buttonDisabled2 = new ButtonDisabled;
        
        it('should be able to switch to disabled', function() {
            buttonEnabled2.set({buttonEnable:false});
            expect(buttonEnabled2.$el.find("[nm-enable]")[0].disabled).to.be.true;
        })

        it('should be able to switch to enabled', function() {
            buttonDisabled2.set({buttonEnable:true});
            expect(buttonDisabled2.$el.find("[nm-enable]")[0].disabled).to.not.be.true;
        })
    });

    describe("pass app/mappings as option to view",function(){

        onoff1 = new Fajita.Model({switchOn: false});
        buttonEnabled3 = new ButtonEnabled({
            model: onoff1,
            mappings: {
                buttonEnable: "switchOn"
            }
        });

        onoff2 = new Fajita.Model({switchOn: false});
        buttonDisabled3 = new ButtonDisabled({
            model: onoff2,
            mappings: {
                buttonEnable: "switchOn"
            }
        });

        it('should show that it is disabled',function(){
            expect(buttonEnabled3.$el.find("[nm-enable]")[0].disabled).to.be.true;
        });

        it('should show that it is enabled',function(){
            expect(buttonDisabled3.$el.find("[nm-enable]")[0].disabled).to.be.true;
        });
    });
   

     describe("app.set",function(){
            onoff3 = new Fajita.Model({switchOn: false});
            buttonEnabled4 = new ButtonEnabled({
                model: onoff3,
                mappings: {
                    buttonEnable: "switchOn"
                }
            });

            it('should show that it is disabled',function(){
                expect(buttonEnabled4.$el.find("[nm-enable]")[0].disabled).to.be.true;
            });

            it('should show that it is enabled',function(){
                onoff3.set({switchOn:true})
                expect(buttonEnabled4.$el.find("[nm-enable]")[0].disabled).to.be.false;
            });

     });

     describe("app.set (with function)",function(){
            onoff4 = new Fajita.Model({switchOn: false});
            buttonEnabled5 = new ButtonEnabled({
                model: onoff4,
                mappings: {
                    buttonEnable: function(){
                        return !this.model.get("switchOn");
                    }
                }
            });

            it('should show that it is disabled',function(){
                onoff4.set({switchOn:false})
                expect(buttonEnabled5.$el.find("[nm-enable]")[0].disabled).to.be.false;
            });

            it('should show that it is enabled',function(){
                onoff4.set({switchOn:true})
                expect(buttonEnabled5.$el.find("[nm-enable]")[0].disabled).to.be.true;
            });
     })


    
})