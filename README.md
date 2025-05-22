# Triple Triad (React)

This project is my best attempt at an authentic browser-based recreation of the Triple Triad minigame from *Final Fantasy VIII* on the PS1 using **React** and **Typescript**.



## Features

- All Triple Triad card rules and trade rules from the original game are present.  
- Your card collection is preserved between sessions.  
- Certain players, denoted with blue text, have a chance to play their rare card like in the original game. They will then stop playing their rare card if you win it from them.  
- If you lose cards to an opponent, they have a chance to play one of your lost cards so you can win it back. These lost cards are also preserved between sessions. Players that hold lost cards are denoted with yellow text.  
- All 110 original cards have been set up, though not all rare cards are currently available as not all players are included in the current build and some cards in the original are acquired outside of trading.  



## Roadmap

Here are some goals I will look to implement in the future:

- A full roster of NPC players from the original game.  
- A Card gallery that matches the style of the Card menu in FF8's main menu.  
- Keyboard Support.  
- Trade Rule Decay that matches the behaviour of the original.  
- Implementing the Queen of Cards, her mechanics and questline.  
- Implementing the CC Group and questline.  



## Live Demo

[https://triple-triad-react.onrender.com/](https://triple-triad-react.onrender.com/)



## Local Installation

```bash
git clone https://github.com/Cyanoxide/triple-triad-react.git
cd triple-triad-react
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.



## Support & Contribution

Currently, the best way you can help support this project is to help me document all the card-playing NPCs and what level of cards they play. The current most comprehensive list is in [AbsoluteSteve's GameFAQs guide](https://gamefaqs.gamespot.com/ps/197343-final-fantasy-viii/faqs/51741). I've used data from that guide and my own findings to make this [editable spreadsheet](https://docs.google.com/spreadsheets/d/19fW1F9t6nEP1TcZr8_We9l8kGpV_lPRxv_ZUyLwCO_0/edit?usp=sharing). Feel free to add to it.

Alternatively, you can support me by just sharing the project or donating here: [https://ko-fi.com/cyanoxide](https://ko-fi.com/cyanoxide)



## Special Thanks

- Sprites: Ultimecia (spriters-resource)  
- Card Player Data: AbsoluteSteve (GameFAQs)  
- Reward Screen Background Accent: Hikashi (Qhimm)
