- get cards reviewed at least N hours ago
- sort by score (desc)
- discards less than min_score

- get cards reviewed sorted by age (desc)
- get top purgatory_size
- discards less than min_score
- sort by score (desc)

Store strategy
==============

- minimize data duplication
- no more array paths (having them as constants was just as bad)
- store is a 'portal'

- on request
    + clear dataloaders
    + transactions on immutable map

- getDeck(store): Probe
- getDeckChildren(store): Probe (or generator??)
- getCard(store): Probe
- getBreadcrumb(store): generator<Probe>

- getPagination(store, 'decks')
- getPagination(store, 'cards')
- getPagination(store, 'stashes')

Routing
=======

browser <--> page.js <--> router <--> store <--> state <--> react


URLs
====

objective: capture [all] state onto urls


GET /decks?per_page=25&page=1&sort_by=...&order_by=...
GET /cards?per_page=25&page=1&sort_by=...&order_by=...
GET /stashes?per_page=25&page=1&sort_by=...&order_by=...

order_by:
- ascending
- asc
- descending
- desc

sort_by:
- title/name
- cards
- updated_at
- created_al
- reviewed_at
- 

/decks/:deck_id/view/ [default route] [defaults to cards]
/decks/:deck_id/view/decks
/decks/:deck_id/view/cards
/decks/:deck_id/view/description
/decks/:deck_id/view/description/edit
/decks/:deck_id/view/meta

/decks/:deck_id/add/deck
/decks/:deck_id/add/card

/cards/:card_id [alias to below]
/decks/:deck_id/card/:card_id/
/decks/:deck_id/card/:card_id/view/description
/decks/:deck_id/card/:card_id/view/description/edit
/decks/:deck_id/card/:card_id/view/stashes
/decks/:deck_id/card/:card_id/view/stashes/added
/decks/:deck_id/card/:card_id/view/stashes/list
/decks/:deck_id/card/:card_id/view/meta
/decks/:deck_id/card/:card_id/view/front
/decks/:deck_id/card/:card_id/view/front/edit
/decks/:deck_id/card/:card_id/view/back
/decks/:deck_id/card/:card_id/view/back/edit


/decks/:deck_id/review
/decks/:deck_id/card/:card_id/review

/stashes
/stashes/add
/stashes/:stash_id/cards
/stashes/:stash_id/review
/stashes/:stash_id/view/description
/stashes/:stash_id/view/description/edit
/stashes/:stash_id/view/meta

/stash/:stash_id/card/:card_id/
/stash/:stash_id/card/:card_id/review


/settings


[done] GET /cards/:id/stashes

[done] PUT /cards/:id/stashes/:stash_id [add card to stash]
[done] DELETE /cards/:id/stashes/:stash_id [remove card to stash]

[done] DELETE /cards/:id/stashes [remove card from all stashes]

GET /stashes/:id/cards
[done] DELETE /stashes/:id/cards [remove all cards in the stash]

GET /stashes/:stash_id/review

User Interface
==============

-----
grokdb     Library | stashes | settings
-----
breadcrumb
-----
card/deck
-----
footer


Development strategy
====================

- important to get state of the app properly designed
- first expose lookup tables and state (immutable) map as text

Relevant libraries
==================

- https://github.com/facebook/dataloader
- immutable.js


Tables
======

Look up table (sync)
- cards
- decks
- stashes

Immutable Map
=============

```js
{
    deck: {
        root: 1,
        self: 2,
        children: [1, 2, 3], // pagination??
        cards: [1, 2, 3] // pagination??
    },

    card: {

    },

    review: {

    },

    stashes: {

    }
}
```


Unresolved
==========

## graphql

https://github.com/graphql/graphql-js

- where does graphql fit in?
