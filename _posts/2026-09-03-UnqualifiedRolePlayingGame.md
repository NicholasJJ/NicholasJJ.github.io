---
title: "Towards an unqualified Role Playing Game"
date: 2026-09-03
categories: [games]
image: /images/blog/urpg/header.png
excerpt: "Some thoughts about a nascent genre"
---

"Role Playing Game" (RPG) is perhaps one of the most overloaded genre-related words I've encountered. It evokes images of character-as-spreadsheet, but that's nowhere in the phrase itself. Somehow adding the prefix "table-top" means that it's not played on a computer, except you can also definitely use a computer to play a "table-top"-rpg. Adding the prefix "computer" to form CRPG does **not** describe all computer-based rpgs, but an early subcategory... shit's weird, man. For the purposes of this article, I'll use "ttrpg" to refer to games that use a human "Game Master", and "Computer RPG" to refer to video games with RPG mechanics.

...

I read "Understanding Comics" by Scott McCloud the other month[^youToo], in which he presents a story about the history of media formed by ink-on-paper (or really, the medium-category of static pictures). He presents drawings and text as two traditions that start in the same place (way back in caveman-times), diverged into their own things, and now comics are getting the squad back together. That's pretty neat, I thinks to myself. Then, myself thinks to I, if Scott McCloud can frame the medium near and dear to his heart as a culmination of thousands of years of history, surely I can manage a measly 50 year story to prop up my own nearanddear medium. That's what this is, by the way. 

[^youToo]: you should too! I mean it, read the book last month! Time Machine! Go!

The biggest difference between the-entire-history-of-ink-on-paper and the-last-50-years-of-RPGs is that RPGs can't claim to have started out as one thing. Old role-playing games[^adnd] had at least 2 elements: wargame-y dice-y stat stuff, and the group storytelling stuff. Are we army generals pontificating over a wargame, or are we the Brontë siblings[^jrr] deciding the next story beat? Both!
A lot of RPG design, you know, boils down to deciding how these two elements fit together. My understanding of early ttrpgs is that the story is basically the "main point", and the stats keep you honest about what happens in the story. Does Glickalack Blimm make that jump over the pit of very hungry cow-sized caterpillars? It shouldn't matter whether Glickalack's completed her "CaRaCtEr ArC", if she skipped leg day (or slipped on some gravel on the run up), she's caterpillar food.
So there's already two lineages, wargames and collaborative storytelling, put together for one goal. To state the obvious, **the goal of a role-playing game is to play the role of an imaginary character in an imaginary world**[^imaginary]. It's just necessary then, if you don't *also* want to roleplay as the world, that the world has a way of pushing back.

[^adnd]: think Advanced Dungeons & Dragons

[^jrr]: ok, maybe sometimes one of us is Tolkien and the rest are his kids listening

[^imaginary]: In the sense that, even if the world and characters are based on reality, you are imagining them in the moment of play. The "Unnecessary" part of Suite's "Unnecessary Obstacles"

![You got this Glickalack!](/images/blog/urpg/jump.png)

Then computers come along, and people start to try and digitize these games, and this whole curfuffle kicks off. Computers, turns out, are big fans of fixed models of the world. You can represent space and gravity and magic in a computer, you just gotta tell it which numbers mean what, and where they should go. This leaves out a lot of hard-to-number features of RPGs, notably social aspects[^act], but also all sorts of one-off flourishes. Say I want Glickalack to use her trusty rope to lasso an outcropping and swing across that pit. If we hadn't previously decided on the outcroppiness of the walls, or the physics of a rope-swing, then a fixed model of the world is screwed here. A human, by contrast, can whip up a those facts, convert them to dice rolls, and move on in less than a minute.

![Nice lateral thinking Glickalack!](/images/blog/urpg/swing.png)

But computers give you something in return for this inflexibility: speed. This gives you the obvious, faster turns in combat, more complected simulation, so on. But it also gives you real-time mechanics and graphical immersion.
Computer Glickalack can't lasso across the pit, but table-top Glickalack can't 360 noscope the caterpillars as she falls to land on a pile of fresh caterpillar corpses. Or, I mean, *she* can, but it won't feel the same as if *you* did it.

[^act]: Seriously, if you compare apples-to-apples, interactions with npcs in even the most amateur ttrpg immediately and obviously pull off a form of interactivity that computers would struggle to emulate for decades.

![I bet Glickalack would be good at CSGO](/images/blog/urpg/shoot.png)

As computer games progressed, some of these newly possible mechanics spun off into genres focused solely on them. First Person Shooters, Factory Games, Survival Horror, Platformers. I'd argue most genres of video game have us roleplay a character, many even have fragments of mechanics we associate with RPGs, but we don't consider these games "Roleplaying Games" because our agency is expressed via *how* the character performs actions, not *which* actions they perform.

Table-Top has, more recently, begun pushing in the opposite direction[^social]. If the cost of the faustian bargain with computers is a flexible world model, what do you get if you lean into that flexibility? Turns out, some pretty cool stuff. Player attributes can be things like "Charisma" or "Dexterity" with clear action consequences, but they can also be framed around consequences themselves. "Fortune" in the dungeon-crawling game HEART can mean how much cash you have, or how lucky you are, or even your skill at haggling, anything you and the game-master agree fits the vibe. 
Blades in the Dark, a gothic heist game, has a central mechanic where players can (at the cost of some stress currency) trigger a "flashback" to the planning stage of their heist, revealing that whatever fiasco they're currently in was really *part of the plan all along* and revealing how they planned around it. Cornered at the end of an alley? Good thing we hung a rope here to give us rooftop access. The assassination target's getting away in a taxi? That's why we bribed the driver to drop them off at our secret base. 
Obviously, the extent of what can be explained via a flashback is something that needs to be decided in good faith between the players and GM, as all parties attempt to balance what's reasonable for the characters, logical for the setting, and exciting for the story.

[^social]: There's a also social side to this, of course. Personally, a big draw for me whenever I sit down to play a ttrpg is to enjoy the company of my fellow players. Knowing that an actual friend is going to have to spend actual time reasoning over how stealing the Caterpillar King's crown jewels will affect the geopolitics of the region is half the reason I had Glickalack do it in the first place. The social tradeoff of involving computers in this feels pretty straightforward, so here I want to focus on the gameplay implications

So, as things currently stand, we're in a similar case to the bifurcated traditions of text and images in McCloud's story about comics. Table-Top and Computer RPGs share the goal of giving players the agency to play the role of a character, but the affordances of their respective mediums have led to divergent opinions on what a "good" form of agency means. LLMs look like a magic bullet on the technical side of things, finally we have this function that can interface with all the real-time computery goodness, while not requiring a pre-set state representation. Unfortunately, they mostly just raise problems on the design side. From most Video Game's perspective, where a designer's spent months creating mechanics with cool properties on *how* to use them, giving the plays other options on *what* mechanics to use feels like shooting yourself in the foot. From the TTRPG perspective, where a GM spent years honing their improv skills to react sensibly no matter *what* players choose to do, giving them high-fidelity control over *how* they do it risks the campaign getting stuck in the weeds.

And I'm torn here, right? Because both these perspectives are true. Focusing on a particular form of agency is a totally reasonable way to describe a genre, and making a game that eschews that focus means making a shitty[^shitty] game by the standards of those previous genres.

[^shitty]: in the same way "Stairway to Heaven" is a shitty audiobook

But let's not kid ourselves and say this is uncharted territory. We[^royal] already have a yardstick, the same one built into any RPG before considering the technical properties of it's chosen medium: **The goal of a role-playing game is to play the role of an imaginary character in an imaginary world.** Just because subsets of that goal are rich and artistically interesting doesn't make the goal itself toothless. Just because players are now given more agency doesn't mean designers must throw up their hands, unable to meaningfully guide the narrative or gameplay.
You, as a human on earth, have a radical amount of agency over both *what* you do with your time and *how* you do it. This agency is also clearly able to be guided by all sorts of factors. If a marketing firm across the globe can find a way to get me to eat at their chain restaurant without even controlling the laws of physics, just imagine the ways we as game designers might influence Glickalack. 
And if we can thread that needle, of controlling exactly what we care about a role while leaving the rest open to expression, I think it's fair to say that we've made a Role Playing Game. Not a Computer Role Playing Game. Not a Table-Top Role Playing Game. A Role Playing Game, Unqualified. By any means necessary.

...

I suspect players use it to befriend the Caterpillars and develop a variant of horseback archery.

[^royal]: I mean, I hope it's a 'we'...

![And they all lived happily ever after](/images/blog/urpg/love.png)