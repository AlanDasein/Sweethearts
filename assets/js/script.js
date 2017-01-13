"use strict";

$(document).ready(function() {

    var settings = {
        various: {
            hintedCards: 3, //number of cards highlight when on hint mode
            explodedCards: 2, //number of surrounding cards to reveal when on grenade mode
            flipAnimationTimer: 250, //time in ms that takes a card to be flipped
            profitAnimationTimer: 100 //time in ms that takes to VISUALLY add winnings to balance
        },
        amounts: [0.5, 1, 2, 5, 10, 20], //amounts that can be placed on a chosen bet
        bets: { //how many bets can be made
            min: 1,
            max: 5
        },
        lives: { //how many lives can be chosen
            min: 2,
            max: 10
        },
        initialValues: {
            balance: 100,
            amount: 1, //amounts index
            bet: 1,
            lives: 10
        },
        deck: [ //card types
            {value: "HEART", amount: 20},
            {value: "NEUTRAL", amount: 15},
            {value: "PLUS ONE", amount: 10},
            {value: "MINUS ONE", amount: 10},
            {value: "HEARTBREAK", amount: 10},
            {value: "HINT", amount: 5},
            {value: "GRENADE", amount: 5},
            {value: "GAME OVER", amount: 5}
        ],
        pays: [ //from chances.min to chances.max
            [0, 0, 5, 250, 1000],
            [0, 0, 1, 25, 250, 1000, 3000],
            [0, 0, 1, 5, 75, 500, 2000, 5000, 7000],
            [0, 0, 0, 3, 15, 250, 1500, 5000, 7000, 10000, 12000],
            [0, 0, 0, 3, 5, 75, 500, 2000, 5000, 8000, 10000, 12000],
            [0, 0, 0, 1, 2, 25, 250, 5000, 8000, 10000, 12000, 15000, 20000],
            [0, 0, 0, 0, 2, 15, 50, 1000, 5000, 10000, 12000, 15000, 20000, 25000],
            [0, 0, 0, 0, 1, 10, 25, 500, 3000, 10000, 12000, 15000, 20000, 50000, 80000],
            [0, 0, 0, 0, 0, 5, 25, 100, 500, 5000, 10000, 12000, 15000, 20000, 50000, 100000]
        ]
    },

    vars = {
        gameInProgress: false,
        systemBusy: false, //when a process like an animation is taking place, no further action is allowed until it finishes
        bankroll: {
            balance: null,
            amount: null, //amount chosen
            bet: null, //bet chosen
            placed: 0,
            won: 0
        },
        game: {
            lives: {
                total: null, //lives chosen
                used: 0
            },
            hearts: 0
        },
        deck: [],
        selectedCards: [],
        clickableCards: [] //it indicates which cards can be clicked when a hint card is uncovered
    },

    dom = {
        balance: $("div.balance span.block"),
        info: $("div.sidebar td.led"), //[0]bet placed, [1]amount won, [2]lives used, [3]hearts collected
        payouts: $("tbody.items"), //rows that show the payouts
        selectors: $("div.footer label"), //[0][1]amount, [2][3]bet, [4][5]lives (first = minus, second = plus)
        deal: $("button.button_big"), //deal button (the help and close button are bind separately in the app initialization to dismiss them after that)
        togglers: $(".toggler"), //buttons to show and hide the help screen
        deck: null //it will hold the deck of cards on the dom after the app be initialized
    },

    tools = {
        shuffleCards: function(a) {
            for(var i = a.length; i; i--) {
                var j = Math.floor(Math.random() * i);
                [a[i - 1], a[j]] = [a[j], a[i - 1]];
            }
        },
        thousandSeparator: function(x) {
            var parts = x.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
        },
        decimalFormat: function(n) {
            var aux;
            if(Number(n) > 0) {
                n += "";
                if(n.indexOf(".") >= 0) {
                    aux = n.split(".");
                    if(aux[1].length < 2) n += "0";
                }
                else n += ".00";
            }
            return n;
        }
    },

    functions = {

        manageSounds: function(which) {
            var audio = new Audio("assets/media/audio/" + which + ".wav");
            audio.play();
        },

        manageSections: function() { //show and hide the help screen
            var sections = $("div.section");
            sections.each(function() {$(this).toggleClass("hide");});
            functions.manageSounds("click");
        },

        manageCovers: function(ind, hide) { //show and hide the layers which prevent elements for being clicked
            var aux = $("div.layer");
            aux.eq(ind).toggleClass("hide", hide);
            if(aux.eq(ind).hasClass("fader")) aux.eq(ind).fadeTo(200, !hide, function() {aux.eq(ind).css("display", "");});
        },

        manageCards: function(param) {

            var go, aux;

            vars.systemBusy = true; //don't do anything until the card(s) is flipped

            for(var i = 0, j = vars.deck.length;i < j;i++) {

                go = param.oper === "HIDE ALL CARDS" || (param.oper === "SHOW ALL CARDS" && !dom.deck.eq(i).hasClass("flipped")) || (param.oper === "PLAY CARD" && param.index === i);

                if(go) {

                    if(param.oper !== "HIDE ALL CARDS") { //get the right card if there is a card to show
                        aux = dom.deck.eq(i).find("div.card_front");
                        $.each(settings.deck, function(i) {aux.removeClass("card_" + settings.deck[i].value.replace(" ", "_").toLowerCase());});
                        aux.addClass("card_" + vars.deck[i].replace(" ", "_").toLowerCase());
                    }

                    dom.deck.eq(i).toggleClass("link", param.oper === "HIDE ALL CARDS");
                    dom.deck.eq(i).toggleClass("flipped", !dom.deck.eq(i).hasClass("flipped"));

                }

            }

            setTimeout(function() {vars.systemBusy = false;}, settings.various.flipAnimationTimer);

        },

        makeSelection: function(obj) { //select amount, bet or lives

            var ind = dom.selectors.index(obj), unit = ind % 2 === 0 ? -1 : 1; //increase or decrease the value according the button pressed

            if(ind < 2) vars.bankroll.amount += unit; //amount
            else if(ind < 4) vars.bankroll.bet += unit; //bet
            else vars.game.lives.total += unit; //lives

            if(vars.bankroll.amount < 0 || vars.bankroll.amount >= settings.amounts.length) { //check amount is in range
                vars.bankroll.amount = vars.bankroll.amount < 0 ? 0 : settings.amounts.length - 1;
            }
            if(vars.bankroll.bet < settings.bets.min || vars.bankroll.bet > settings.bets.max) { //check bet is in range
                vars.bankroll.bet = vars.bankroll.bet < settings.bets.min ? settings.bets.min : settings.bets.max;
            }
            if(vars.game.lives.total < settings.lives.min || vars.game.lives.total > settings.lives.max) { //check lives is in range
                vars.game.lives.total = vars.game.lives.total < settings.lives.min ? settings.lives.min : settings.lives.max;
            }

            vars.bankroll.placed = functions.getBet();

            functions.updateDom(["BET", "PAYOUTS", "SELECTORS"]);
            functions.manageSounds("click");
            
        },

        updateDom: function(elms) { //a list of elements to update

            var aux, i, j, k, l, m;

            elms = elms || ["ALL"]; //all elements if there aren't elements defined

            for(i = 0, j = elms.length;i < j;i++) {
                if(elms[i] === "BALANCE" || elms[i] === "ALL") dom.balance.text(tools.thousandSeparator(tools.decimalFormat(vars.bankroll.balance)));
                if(elms[i] === "BET" || elms[i] === "ALL") dom.info.eq(0).text(tools.thousandSeparator(tools.decimalFormat(functions.getBet()))); //bet placed
                if(elms[i] === "GAME" || elms[i] === "ALL") {
                    dom.info.eq(1).text(tools.thousandSeparator(tools.decimalFormat(vars.bankroll.won))); //amount won
                    dom.info.eq(2).text(vars.game.lives.total - vars.game.lives.used); //lives used
                    dom.info.eq(3).text(vars.game.hearts); //hearts collected
                }
                if(elms[i] === "PAYOUTS" || elms[i] === "ALL") { //get payout values
                    m = vars.game.lives.total - settings.lives.min;
                    aux = "";
                    for(k = 0, l = settings.pays[m].length;k < l;k++) {
                        if(settings.pays[m][k] > 0) {
                            aux += "<tr><td colspan='2' class='divisor'></td></tr><tr dt-v='" + settings.pays[m][k] + "'><td>" + k + " &#9829</td><td>" + (tools.thousandSeparator(settings.pays[m][k] * vars.bankroll.bet)) + "</td></tr>";
                        }
                    }
                    dom.payouts.html(aux);
                }
                if(elms[i] === "SELECTORS" || elms[i] === "ALL") {
                    aux = $("div.footer span"); //elements on the DOM showing the selections ([0]amount, [1]bet, [2]lives)
                    aux.each(function(i) {
                        $(this).text(i === 0 ? "$" + settings.amounts[vars.bankroll.amount] : (i === 1 ? vars.bankroll.bet : vars.game.lives.total));
                    });
                }
            }

        },

        getBet: function() {return settings.amounts[vars.bankroll.amount] * vars.bankroll.bet;},

        getWinnings: function() {
            var payout = settings.pays[vars.game.lives.total - settings.lives.min][vars.game.hearts], aux;
            if(payout > 0) { //highlight the amount reached on the payouts table
                aux = dom.payouts.find("tr:odd");
                aux.each(function() {
                    $(this).removeClass("hit");
                    if(Number($(this).attr("dt-v")) === payout) $(this).addClass("hit");
                });
            }
            return functions.getBet() * payout;
        },

        gameflow: function(param) {

            var todo, aux = [];

            switch(param.stage) { //define actions acording the stage of the game
                case "INIT":
                    todo = ["SHUFFLE CARDS", "SHOW ALL CARDS"];
                    break;
                case "START":
                    todo = (vars.bankroll.balance - vars.bankroll.placed) >= 0 ? ["RESET APP", "SHUFFLE CARDS", "HIDE ALL CARDS", "PROGRESS ON"] : ["OUT OF FUNDS"];
                    break;
                case "END":
                    todo = ["SHOW ALL CARDS", "PROGRESS OFF", "GET RESULT"];
                    break;
                case "PLAY":
                    todo = vars.selectedCards.indexOf(param.index) < 0 ? ["PLAY CARD"] : [""]
                    break;
            }

            for(var i = 0, j = todo.length;i < j;i++) { //execute defined actions to do

                vars.gameInProgress = todo[i] === "PROGRESS ON" ? true : (todo[i] === "PROGRESS OFF" ? false : vars.gameInProgress);

                if(todo[i] === "OUT OF FUNDS") alert("Sorry, not enough funds to play this bet");
                if(todo[i] === "SHUFFLE CARDS") tools.shuffleCards(vars.deck);
                if(todo[i] === "SHOW ALL CARDS" || todo[i] === "HIDE ALL CARDS") functions.manageCards({oper: todo[i]});

                if(todo[i] === "RESET APP") { //reset pertinent variables on every new game/deal
                    vars.bankroll.balance -= vars.bankroll.placed;
                    vars.bankroll.won = 0;
                    vars.game.lives.used = 0;
                    vars.game.hearts = 0;
                    vars.selectedCards = [];
                    functions.manageCovers(1, 0);
                    aux = $("tr.hit");
                    if(aux.length) aux.removeClass("hit");
                    functions.manageSounds("deal");
                }

                if(todo[i] === "PLAY CARD" && (vars.clickableCards.length === 0 || vars.clickableCards.indexOf(param.index) >= 0)) { //click on card

                    vars.selectedCards.push(param.index); //mark the clicked card as already revealed

                    functions.manageCards({oper: todo[i], index: param.index}); //reveal the card on the DOM

                    if(vars.clickableCards.length > 0) { //remove highlighted cards if there were highlighted cards
                        $.each(vars.clickableCards, function(i) {dom.deck.eq(vars.clickableCards[i]).removeClass("highlighted");});
                        vars.clickableCards = [];
                        functions.manageCovers(0, 1);
                    }

                    //decrease (or not) lives according with the clicked card
                    vars.game.lives.used = (vars.deck[param.index] === "GAME OVER") ? vars.game.lives.total : (
                        vars.game.lives.used + (
                            vars.deck[param.index] === "PLUS ONE" ? 0 : (
                                vars.deck[param.index] === "MINUS ONE" && vars.game.lives.used !== vars.game.lives.total - 1 ? 2 : 1
                            )
                        )
                    );

                    //play card sound
                    functions.manageSounds(
                        vars.game.lives.used === vars.game.lives.total && vars.deck[param.index] !== "HEART" && vars.deck[param.index] !== "PLUS ONE" ? "game_over" : vars.deck[param.index].replace(" ", "_").toLowerCase()
                    );

                    //check if a heart was collected, not collected or lost
                    vars.game.hearts += vars.deck[param.index] === "HEART" ? 1 : (vars.deck[param.index] === "HEARTBREAK" && vars.game.hearts > 0 ? -1 : 0);

                    if(vars.deck[param.index] === "GRENADE") { //grenade card

                        aux["cards"] = [ //get the cards around the clicked card
                            param.index === 48 ? -1 : param.index - (param.index >= 40 && param.index <= 47 ? 8 : 9), //top card
                            param.index === 31 ? -1 : param.index + (param.index >= 32 && param.index <= 39 ? 8 : 9), //bottom card
                            param.index === 40 || (param.index + (param.index > 36 ? 1 : 0)) % 9 === 0 ? -1 : param.index - 1, //left card
                            param.index === 39 || (param.index + (param.index > 35 ? 2 : 1)) % 9 === 0 ? -1 : param.index + 1 //right card
                        ];

                        aux["validCards"] = [];

                        $.each(aux["cards"], function(i) { //filter the surrounding cards to get only valid cards and cards that aren't been revealed yet
                            if(aux["cards"][i] >= 0 && aux["cards"][i] < vars.deck.length && vars.selectedCards.indexOf(aux["cards"][i]) < 0) {
                                aux["validCards"].push(aux["cards"][i]);
                            }
                        });

                        if(aux["validCards"].length > 0) {
                            tools.shuffleCards(aux["validCards"]); //shuffle the surrounding cards to reveal 2 of them randomly
                            $.each(aux["validCards"], function(i) {
                                if(i < settings.various.explodedCards) { //only a maximum of ? surrounding cards will be revealed
                                    vars.selectedCards.push(aux["validCards"][i]);
                                    if(vars.deck[aux["validCards"][i]] === "HEART") vars.game.hearts++;
                                    if(vars.game.lives.used < vars.game.lives.total) {
                                        setTimeout(function() {
                                            functions.manageCards({oper: "PLAY CARD", index: aux["validCards"][i]});
                                        }, Math.round(settings.various.flipAnimationTimer / 1.5) * (i + 1));
                                    }
                                    else functions.manageCards({oper: "PLAY CARD", index: aux["validCards"][i]});
                                }
                            });
                        }

                    }

                    if(vars.deck[param.index] === "HINT" && vars.game.lives.used < vars.game.lives.total) { //hint card (valid only if at least a life remain)

                        //get all the cards that haven't been revealed yet and shuffle them
                        aux["deck"] = [];
                        $.each(vars.deck, function(i) {if(vars.selectedCards.indexOf(i) < 0) aux["deck"].push(i);});
                        tools.shuffleCards(aux["deck"]);

                        $.each(aux["deck"], function(i) { //get the hinted card
                            if(vars.deck[aux["deck"][i]] === "HEART" && vars.clickableCards.length === 0) {
                                vars.clickableCards.push(aux["deck"][i]);
                            }
                        });

                        $.each(aux["deck"], function(i) { //get the other ? cards to mask the hint
                            if(vars.clickableCards.length < settings.various.hintedCards && vars.clickableCards.indexOf(aux["deck"][i]) < 0 && vars.deck[aux["deck"][i]] !== "HEART") {
                                vars.clickableCards.push(aux["deck"][i]);
                            }
                        });

                        //make clickable only the hinted cards
                        $.each(vars.clickableCards, function(i) {dom.deck.eq(vars.clickableCards[i]).addClass("highlighted");});
                        functions.manageCovers(0, 0);

                    }

                    vars.bankroll.won = functions.getWinnings(); //check the amount won so far

                    if(vars.game.hearts === 20 || vars.game.lives.used === vars.game.lives.total) functions.gameflow({stage: "END"}); //end of the hand/game

                }

                if(todo[i] === "GET RESULT") { //end of the game

                    if(vars.bankroll.won === 0) functions.manageCovers(1, 1);
                    else { //there was a profit; add it to the balance with animation

                        aux["payout"] = settings.pays[vars.game.lives.total - settings.lives.min][vars.game.hearts] * vars.bankroll.bet;
                        aux["speed"] = vars.bankroll.won >= 50 ? 25 : settings.various.profitAnimationTimer;

                        aux["timer"] = setInterval(function() {
                            if(aux["payout"] === 0) {
                                clearInterval(aux["timer"]);
                                functions.manageCovers(1, 1);
                                vars.systemBusy = false;
                            }
                            else {
                                vars.systemBusy = true;
                                vars.bankroll.balance += settings.amounts[vars.bankroll.amount];
                                vars.bankroll.won -= settings.amounts[vars.bankroll.amount];
                                functions.updateDom(["BALANCE", "GAME"]);
                                aux["payout"]--;
                                aux["speed"] -= (aux["speed"] > 25 ? 5: 0);
                                functions.manageSounds("coin");
                            }
                        }, aux["speed"]);

                    }

                }

            }

            functions.updateDom(param.stage === "PLAY" ? ["BALANCE", "GAME"] : (param.stage === "INIT" ? ["ALL"] : ["GAME", "BALANCE"]));

        }

    };

    +function() { //initialize the app

        var content = $("div.content"), i, j, k;

        //initialize app
        vars.bankroll.balance = settings.initialValues.balance;
        vars.bankroll.amount = settings.initialValues.amount;
        vars.bankroll.bet = settings.initialValues.bet;
        vars.bankroll.placed = functions.getBet();
        vars.game.lives.total = settings.initialValues.lives;

        //create deck of cards
        for(i = 0, j = settings.deck.length;i < j;i++) {
            for(k = 0;k < settings.deck[i].amount;k++) {
                vars.deck.push(settings.deck[i].value);
                content.append("<div class='panel left'><div class='card_back'></div><div class='card_front'></div></div>");
                if(vars.deck.length === 40) content.append("<div class='hole left'></div>");
            }
        }
        dom.deck = $("div.content div.panel");

        //assign functionality
        dom.togglers.on("click", function() {functions.manageSections();});
        dom.selectors.on("click", function() {if(!vars.gameInProgress && !vars.systemBusy) functions.makeSelection($(this));});
        dom.deal.on("click", function() {if(!vars.gameInProgress && !vars.systemBusy) functions.gameflow({stage: "START"});});
        dom.deck.on("click", function() {if(vars.gameInProgress && !vars.systemBusy) functions.gameflow({stage: "PLAY", index: dom.deck.index(this)});});

        functions.gameflow({stage: "INIT"}); //init app

        //preload
        content = $("div.container");
        content.removeClass("hide");

    }();

});