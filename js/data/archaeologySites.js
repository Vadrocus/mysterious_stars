// archaeologySites.js - Archaeological site narrative content

export const ARCHAEOLOGY_SITES = {
    sites: {
        // Site 1: The Ancient Station - standalone site
        site_ancient_station: {
            id: 'site_ancient_station',
            name: 'The Drifting Observatory',
            description: 'A derelict orbital station of unknown origin, its hull scarred by millennia of micrometeorite impacts.',
            layers: [
                {
                    title: 'Initial Survey',
                    narrative: `The station hangs in orbit around {PLANET_NAME}, its running lights long dead. Preliminary scans detect residual power signatures deep within the structure. The exterior shows deliberate damage patterns - this wasn't abandonment, it was sabotage.

Three entry points present themselves: a damaged cargo bay, a sealed crew airlock, and a breach in what appears to be the observation deck.`,
                    choices: [
                        {
                            text: 'Enter through the cargo bay',
                            hint: 'Safer but may miss important areas',
                            outcome: 'You navigate through floating debris and damaged containers.',
                            rewards: { minerals: 25 },
                            lore: 'cargo_manifest'
                        },
                        {
                            text: 'Attempt the sealed airlock',
                            hint: 'May require bypassing security',
                            outcome: 'The airlock responds to universal protocols - whoever built this wanted visitors someday.',
                            rewards: { research: 15 },
                            lore: 'airlock_codes'
                        },
                        {
                            text: 'Enter through the observation breach',
                            hint: 'Direct but potentially dangerous',
                            outcome: 'The view from here is staggering - someone built this to watch something specific.',
                            rewards: { research: 20 },
                            lore: 'observation_logs',
                            consequences: { damage: 5 }
                        }
                    ],
                    tags: ['exploration', 'derelict']
                },
                {
                    title: 'The Main Computer',
                    narrative: `The station's central computer core still functions, though corrupted data streams flicker across ancient displays. A translation matrix slowly parses the alien text: this was a monitoring station, watching for something in deep space.

The logs reference "the signal" repeatedly. Most entries are corrupted, but three data clusters remain intact.`,
                    choices: [
                        {
                            text: 'Access the astronomical records',
                            outcome: 'Star charts unfold, marking locations across the galaxy. Some systems bear warning glyphs.',
                            rewards: { research: 30 },
                            lore: 'The station tracked objects across multiple systems. Several coordinates match known space - including {SYSTEM_NAME}.',
                            crossReference: 'site_void_signal'
                        },
                        {
                            text: 'Recover the personnel files',
                            outcome: 'Images of the crew emerge - humanoid but wrong. Their eyes are too large, adapted for darkness.',
                            rewards: { research: 20 },
                            lore: 'The inhabitants were watchers, bred for vigil. They called themselves the Selurian.'
                        },
                        {
                            text: 'Download the warning protocols',
                            outcome: 'Emergency procedures scroll past. They weren\'t watching for discovery - they were watching for return.',
                            rewards: { energy: 40 },
                            techBonus: { category: 'subterfuge', amount: 25 },
                            lore: 'Something drove the Selurian to eternal vigilance. These protocols suggest they feared it might come back.'
                        }
                    ],
                    tags: ['computer', 'lore']
                },
                {
                    title: 'The Observatory Chamber',
                    narrative: `At the station's heart, an enormous lens array points into the void. The targeting computer indicates it was focused on a specific region of space - empty now, but marked with the designation "ORIGIN POINT."

Beside the controls, a preserved log crystal contains the final entry of the station commander.`,
                    choices: [
                        {
                            text: 'Analyze the lens targeting data',
                            outcome: 'The coordinates point to a region of apparently empty space, lightyears distant.',
                            rewards: { research: 35 },
                            lore: 'Whatever they watched for, it came from beyond known space. The Selurian tracked its approach for centuries.'
                        },
                        {
                            text: 'Play the commander\'s final log',
                            outcome: 'A weary voice speaks of duty and sacrifice. They knew what was coming. They chose to stay.',
                            rewards: { research: 25 },
                            lore: '"We cannot stop it. We can only ensure others have time to prepare. The signal must reach the Architects."'
                        }
                    ],
                    tags: ['revelation', 'mystery']
                },
                {
                    title: 'The Final Chamber',
                    narrative: `Behind a sealed door marked with warning glyphs, you discover the station's true purpose: a transmitter array, still powered, still broadcasting a single repeating message into deep space.

The message is simple, barely more than a pulse. But it's been broadcasting for ten thousand years.`,
                    choices: [
                        {
                            text: 'Decipher the message content',
                            outcome: 'A warning, encoded in mathematics. Something is sleeping. Something should not be woken.',
                            rewards: { research: 50 },
                            lore: 'The Selurian message warns of "those who dream between stars." It begs recipients not to answer if called.'
                        },
                        {
                            text: 'Shut down the transmitter',
                            outcome: 'Silence falls for the first time in millennia. Whatever they feared - you\'ve stopped warning the galaxy.',
                            rewards: { energy: 100 },
                            consequences: { event: 'silenced_warning' },
                            lore: 'The warning is silenced. If anything was listening, it now knows the watchers are gone.'
                        },
                        {
                            text: 'Boost the signal strength',
                            outcome: 'The message screams into the void with renewed urgency. Somewhere, perhaps, someone will hear.',
                            rewards: { research: 40 },
                            techBonus: { category: 'subterfuge', amount: 30 },
                            lore: 'You\'ve amplified an ancient warning. Whether anyone is left to heed it remains unknown.'
                        }
                    ],
                    tags: ['choice', 'consequence']
                }
            ],
            completionBonus: {
                research: 50,
                energy: 50
            }
        },

        // Site 2: The Silent Tomb - standalone site
        site_silent_tomb: {
            id: 'site_silent_tomb',
            name: 'The Silent Tomb',
            description: 'Beneath the surface of {PLANET_NAME}, scans reveal a massive artificial structure. It radiates cold.',
            layers: [
                {
                    title: 'Descent',
                    narrative: `The entrance shaft descends three kilometers through solid rock, carved with impossible precision. Temperature drops steadily as you descend. At the bottom, a vast chamber opens - and within it, row upon row of crystal sarcophagi, each containing a preserved alien form.

They are not the Selurian. These are something older.`,
                    choices: [
                        {
                            text: 'Examine the nearest sarcophagus',
                            outcome: 'The occupant appears humanoid but symmetrical in ways biology shouldn\'t allow. It\'s beautiful and deeply wrong.',
                            rewards: { research: 25 },
                            lore: 'The preserved beings have six-fold symmetry. Their bodies seem designed rather than evolved.'
                        },
                        {
                            text: 'Study the chamber architecture',
                            outcome: 'The geometry hurts to look at. This place was built to contain something - or someone.',
                            rewards: { minerals: 30 },
                            lore: 'The tomb\'s construction predates known civilization by millions of years. It was built to last.'
                        },
                        {
                            text: 'Search for control systems',
                            outcome: 'Near the far wall, a console pulses with faint light. It\'s waiting.',
                            rewards: { research: 20 },
                            lore: 'The control systems respond to proximity. Something here wants to communicate.'
                        }
                    ],
                    tags: ['discovery', 'ancient']
                },
                {
                    title: 'The Preserved',
                    narrative: `Deeper analysis reveals the truth: these aren't corpses. The beings in the sarcophagi are alive - in a state of suspension so profound it barely registers as life. Millions of them, sleeping through epochs.

One sarcophagus differs from the rest. It's larger, more ornate, and its occupant's eyes are open.`,
                    choices: [
                        {
                            text: 'Approach the awakened one',
                            outcome: 'Its eyes track your movement. It cannot move, cannot speak. But it sees you.',
                            rewards: { research: 40 },
                            lore: 'The elder being communicates through directed thought. It shows you images of fire consuming stars.',
                            consequences: { damage: 10 }
                        },
                        {
                            text: 'Analyze the suspension technology',
                            outcome: 'The technology is beyond your understanding, but fragments of data yield insights.',
                            rewards: { research: 35 },
                            techBonus: { category: 'economy', amount: 30 },
                            lore: 'Their suspension technology could preserve life indefinitely. They chose eternity over extinction.'
                        }
                    ],
                    tags: ['alien', 'stasis']
                },
                {
                    title: 'The Dreaming Mind',
                    narrative: `The elder being's psychic emanations grow stronger. Images flood your mind: a galaxy in flames, stars dying before their time, entire civilizations consumed by something that moved between worlds like a plague.

These beings didn't retreat here to sleep. They're hiding.`,
                    choices: [
                        {
                            text: 'Ask what they\'re hiding from',
                            outcome: 'The image sears itself into memory: hunger given form, emptiness that consumes. The Devourers.',
                            rewards: { research: 50 },
                            lore: 'The Devourers consumed the elder race\'s civilization. The sleepers chose eternal fugue over feeding that hunger.',
                            crossReference: 'site_void_signal'
                        },
                        {
                            text: 'Ask why they remained',
                            outcome: 'Purpose. Duty. Someone had to remember. Someone had to warn those who came after.',
                            rewards: { research: 45 },
                            lore: 'The sleepers serve as living memory. When the Devourers return, they will wake and bear witness to the end.'
                        }
                    ],
                    tags: ['psychic', 'revelation']
                },
                {
                    title: 'The Choice',
                    narrative: `The elder being makes a request: release them. A control exists that would end their suspension, letting them finally rest. But they've slept so long, absorbing the dreams of the galaxy. What knowledge would die with them?

Alternatively, their suspension technology could be adapted for your own purposes.`,
                    choices: [
                        {
                            text: 'Grant them peace',
                            outcome: 'One by one, the lights fade. Something ancient and sad passes from the universe, grateful at last.',
                            rewards: { research: 100 },
                            lore: 'The last of the Precursors are gone. Their final gift was knowledge: the Devourers can be stopped. The answer lies among the stars they built.'
                        },
                        {
                            text: 'Harvest their technology',
                            outcome: 'The suspension systems yield incredible insights. The sleepers continue their vigil, unacknowledged.',
                            rewards: { minerals: 150, energy: 150 },
                            techBonus: { category: 'economy', amount: 50 },
                            lore: 'You\'ve taken what you could use. The sleepers remain, dreaming of fire.'
                        },
                        {
                            text: 'Attempt to wake them all',
                            outcome: 'The awakening fails. Most do not survive the trauma of returning. A handful wake, confused and ancient.',
                            rewards: { research: 75 },
                            consequences: { damage: 20 },
                            lore: 'The survivors share fragmented memories of their civilization\'s end. They speak of Architects who might yet save this galaxy.'
                        }
                    ],
                    tags: ['choice', 'ethics']
                }
            ],
            completionBonus: {
                research: 75,
                minerals: 25
            }
        },

        // Site 3: Crystal Caves - META-CHAIN SITE 1
        site_crystal_caves: {
            id: 'site_crystal_caves',
            name: 'The Resonance Caverns',
            description: 'A network of caves lined with crystals that vibrate at frequencies matching stellar harmonics.',
            layers: [
                {
                    title: 'The Singing Stones',
                    narrative: `The cave entrance pulses with sound at the edge of hearing. Inside, massive crystal formations resonate with each other, creating complex harmonies that your equipment struggles to analyze.

These aren't natural formations. Someone grew these crystals with purpose.`,
                    choices: [
                        {
                            text: 'Record the harmonic patterns',
                            outcome: 'The patterns are information - complex data encoded in sound waves.',
                            rewards: { research: 30 },
                            lore: 'The crystals sing star positions. They\'re a map written in music.'
                        },
                        {
                            text: 'Analyze crystal composition',
                            outcome: 'The crystals contain elements not found in normal space. They were manufactured elsewhere.',
                            rewards: { minerals: 40 },
                            lore: 'These crystals weren\'t mined - they were sung into existence by the Stellar Architects.',
                            metaChainKey: 'crystal_origin'
                        }
                    ],
                    tags: ['discovery', 'meta-chain']
                },
                {
                    title: 'The Heart Chamber',
                    narrative: `At the cavern's center, a single crystal formation rises like a monument. It's different from the others - darker, denser, and when your team approaches, it begins to glow.

It responds to consciousness. It wants to show you something.`,
                    choices: [
                        {
                            text: 'Allow the connection',
                            outcome: 'Your mind expands. You see the galaxy from above, hyperlanes glowing like a neural network.',
                            rewards: { research: 50 },
                            lore: 'The Architects built the hyperlanes. They connected the stars like neurons in a vast mind.',
                            metaChainKey: 'crystal_origin'
                        },
                        {
                            text: 'Resist and analyze from distance',
                            outcome: 'The crystal dims but yields data. Safe, but incomplete.',
                            rewards: { research: 30, minerals: 30 },
                            lore: 'Surface scans reveal the crystal is billions of years old. It predates the formation of most nearby stars.'
                        }
                    ],
                    tags: ['psychic', 'meta-chain']
                },
                {
                    title: 'The Star Map',
                    narrative: `The heart crystal projects a holographic display: a map of the local cluster, with certain stars marked in gold. These aren't random - they're the stars where other sites have been found. The Architects left a trail.

One location pulses urgently. It's a system in this galaxy, marked as "THE VOICE."`,
                    choices: [
                        {
                            text: 'Memorize the marked locations',
                            outcome: 'The coordinates sear into memory. You know where to look next.',
                            rewards: { research: 60 },
                            lore: 'The Architects marked their greatest works. The Voice was their final message to those who would follow.',
                            crossReference: 'site_void_signal'
                        },
                        {
                            text: 'Extract the projection technology',
                            outcome: 'The holographic system can be adapted for tactical use.',
                            rewards: { minerals: 50 },
                            techBonus: { category: 'military', amount: 35 },
                            lore: 'You\'ve sacrificed knowledge for power. The map fades, but its secrets are gone.'
                        }
                    ],
                    tags: ['map', 'meta-chain']
                },
                {
                    title: 'The Architect\'s Gift',
                    narrative: `As you prepare to leave, the heart crystal splits open. Inside, a smaller crystal floats, perfectly preserved. It hums with contained energy - a gift left for whoever would find this place and understand its purpose.`,
                    choices: [
                        {
                            text: 'Take the crystal intact',
                            outcome: 'The crystal resonates with something far away. You feel connected to a larger purpose.',
                            rewards: { research: 75 },
                            lore: 'The Architect\'s key. Three exist. Together, they reveal the truth the Architects died to preserve.',
                            metaChainKey: 'crystal_origin'
                        },
                        {
                            text: 'Fragment it for analysis',
                            outcome: 'The crystal yields materials and data, but its greater purpose is lost.',
                            rewards: { minerals: 100, energy: 100 },
                            techBonus: { category: 'economy', amount: 40 },
                            lore: 'Raw power, extracted. Whatever the crystal was meant to unlock remains sealed.'
                        }
                    ],
                    tags: ['choice', 'meta-chain']
                }
            ],
            completionBonus: {
                research: 100,
                energy: 50
            }
        },

        // Site 4: The Void Signal - META-CHAIN SITE 2
        site_void_signal: {
            id: 'site_void_signal',
            name: 'The Echo Station',
            description: 'A relay station broadcasting an ancient signal into a region of space that should be empty.',
            layers: [
                {
                    title: 'The Endless Broadcast',
                    narrative: `The station has been transmitting the same signal for eons. Your analysts work to decode it, and when they succeed, the message is simple: coordinates and a single word in a dead language.

The word translates as "REMEMBER."`,
                    choices: [
                        {
                            text: 'Trace the signal\'s destination',
                            outcome: 'The signal points to empty space - but the emptiness is artificial. Something is hidden there.',
                            rewards: { research: 40 },
                            lore: 'The Architects hid something in the void. The signal exists to remind someone - or something - where to look.'
                        },
                        {
                            text: 'Analyze the signal\'s origin',
                            outcome: 'The signal originated from multiple sources simultaneously, coordinated across vast distances.',
                            rewards: { research: 35 },
                            lore: 'This is one of many stations. They formed a network, singing the same song to the void.',
                            crossReference: 'site_crystal_caves'
                        }
                    ],
                    tags: ['signal', 'meta-chain']
                },
                {
                    title: 'The Listener\'s Log',
                    narrative: `The station wasn't just transmitting - it was receiving. Logs show responses to the signal, getting progressively more distant over millions of years. Someone out there was answering.

The last response came ten thousand years ago. Then silence.`,
                    choices: [
                        {
                            text: 'Study the response patterns',
                            outcome: 'The responses were acknowledgments. Something was maintaining the network, until it stopped.',
                            rewards: { research: 50 },
                            lore: 'The Architects maintained their network until something ended them. The stations continue without their builders.',
                            metaChainKey: 'void_message'
                        },
                        {
                            text: 'Broadcast a new message',
                            outcome: 'Your signal joins the chorus. If anything remains to hear it, it knows you\'re here now.',
                            rewards: { research: 30 },
                            consequences: { event: 'first_contact_attempt' },
                            lore: 'You\'ve announced your presence to the void. Whether that was wise remains to be seen.'
                        }
                    ],
                    tags: ['communication', 'meta-chain']
                },
                {
                    title: 'The Hidden Archive',
                    narrative: `Behind the transmitter array, a sealed chamber contains data storage of staggering capacity. Most is corrupted beyond recovery, but fragments remain: images of beings of light constructing stars, shaping hyperlanes, building a galaxy.

The Architects weren't just advanced. They were architects in truth.`,
                    choices: [
                        {
                            text: 'Download everything recoverable',
                            outcome: 'Terabytes of data transfer, most incomprehensible. But fragments reveal profound truths.',
                            rewards: { research: 75 },
                            lore: 'The Architects built the hyperlane network. They seeded life throughout the galaxy. And then they faced something that could destroy even them.',
                            metaChainKey: 'void_message'
                        },
                        {
                            text: 'Focus on practical technology',
                            outcome: 'You extract what can be immediately applied, leaving mysteries for others.',
                            rewards: { minerals: 80, energy: 80 },
                            techBonus: { category: 'subterfuge', amount: 50 },
                            lore: 'Stealth technology of impossible sophistication. The Architects knew how to hide from things that hunted between stars.'
                        }
                    ],
                    tags: ['archive', 'meta-chain']
                },
                {
                    title: 'The Architect\'s Plea',
                    narrative: `The final uncorrupted file is a message, preserved for whoever would find it:

"We built this galaxy to be a fortress against the dark. We failed. But we left keys for those who would come after. Find the three voices. Sing them together. The Monument will answer, and you will learn how to finish what we began."`,
                    choices: [
                        {
                            text: 'Preserve the message',
                            outcome: 'The Architects\' final words are recorded. Three voices, three keys, one answer.',
                            rewards: { research: 60 },
                            lore: 'The three voices are scattered across the stars. Together, they unlock the Architects\' greatest secret.',
                            metaChainKey: 'void_message'
                        },
                        {
                            text: 'Search for the Monument\'s location',
                            outcome: 'The station\'s data yields coordinates - a specific location that matches the monument site.',
                            rewards: { research: 70 },
                            lore: 'The Monument exists. It waits at the coordinates the Architects marked as sacred.',
                            crossReference: 'site_stellar_monument'
                        }
                    ],
                    tags: ['message', 'meta-chain']
                }
            ],
            completionBonus: {
                research: 100,
                energy: 75
            }
        },

        // Site 5: The Stellar Monument - META-CHAIN SITE 3
        site_stellar_monument: {
            id: 'site_stellar_monument',
            name: 'The Stellar Monument',
            description: 'An artificial structure the size of a small moon, orbiting where no planet should exist.',
            layers: [
                {
                    title: 'The Impossible Object',
                    narrative: `It shouldn't exist. An artificial construct of perfect geometry, orbiting a gravitational point that has no mass. The Monument hangs in space like a memorial to physics itself.

Your ship approaches what appear to be docking clamps, ancient but functional.`,
                    choices: [
                        {
                            text: 'Dock with the structure',
                            outcome: 'The clamps engage automatically. Something inside the Monument noticed your approach.',
                            rewards: { research: 35 },
                            lore: 'The Monument welcomes visitors. It was built to be found, by those worthy of finding it.'
                        },
                        {
                            text: 'Scan the exterior thoroughly first',
                            outcome: 'The surface is covered in symbols you recognize from other sites. This is the culmination.',
                            rewards: { research: 40 },
                            lore: 'The symbols match those found at other Architect sites. This is where all paths were meant to lead.',
                            crossReference: 'site_crystal_caves'
                        }
                    ],
                    tags: ['discovery', 'meta-chain']
                },
                {
                    title: 'The Hall of Voices',
                    narrative: `Inside, an enormous chamber awaits. Three alcoves line the walls, each containing a crystalline pedestal. Two pedestals glow faintly - responding to something in your possession? In your memory?

If you've found the other sites, their gifts resonate here.`,
                    choices: [
                        {
                            text: 'Approach the resonating pedestals',
                            outcome: 'The crystals sing together. Knowledge floods your mind - the Architects\' gift to their inheritors.',
                            rewards: { research: 100 },
                            lore: 'The voices harmonize. You understand now: the hyperlanes are a weapon, a shield, a key. They can be awakened.',
                            metaChainKey: 'stellar_architects'
                        },
                        {
                            text: 'Examine the dormant pedestal',
                            outcome: 'It awaits a key you don\'t possess. Somewhere, another site remains undiscovered.',
                            rewards: { research: 50 },
                            lore: 'The third voice is missing. Without all three, the Monument\'s secret remains sealed.'
                        }
                    ],
                    tags: ['revelation', 'meta-chain']
                },
                {
                    title: 'The Architects\' Legacy',
                    narrative: `The Monument's central chamber opens. Within, a holographic display shows the galaxy - but the hyperlanes pulse with light. A control interface rises from the floor.

The Architects didn't just build travel lanes. They built a defensive grid, dormant for eons, waiting to be activated.`,
                    choices: [
                        {
                            text: 'Study the grid\'s capabilities',
                            outcome: 'The hyperlanes can be weaponized, disrupted, or strengthened. The galaxy itself is a fortress.',
                            rewards: { research: 75 },
                            techBonus: { category: 'military', amount: 50 },
                            lore: 'The Architects prepared this galaxy for war. A war against something that consumes stars.',
                            metaChainKey: 'stellar_architects'
                        },
                        {
                            text: 'Access the power systems',
                            outcome: 'Energy beyond measure flows through the Monument. You tap a fraction for your empire.',
                            rewards: { energy: 200, minerals: 100 },
                            lore: 'The Monument\'s power is vast but finite. The Architects saved it for the final battle.'
                        }
                    ],
                    tags: ['weapon', 'meta-chain']
                },
                {
                    title: 'The Final Truth',
                    narrative: `At the chamber's heart, a final message awaits:

"We are gone, but our work remains. The Devourers will return - they always return. When they do, use what we left behind. The hyperlanes are your sword. The Monument is your shield. But the will to fight must be your own.

Inherit our legacy. Save what we could not."`,
                    choices: [
                        {
                            text: 'Accept the inheritance',
                            outcome: 'The Monument acknowledges you as heir to the Architects. Systems begin transferring to your control.',
                            rewards: { research: 150, energy: 100, minerals: 100 },
                            lore: 'You are the Architects\' heir. The galaxy\'s defense is now your responsibility.',
                            metaChainKey: 'stellar_architects'
                        },
                        {
                            text: 'Take only what you need',
                            outcome: 'You claim resources but refuse the burden. The Monument falls silent, waiting for another.',
                            rewards: { minerals: 200, energy: 200 },
                            techBonus: { category: 'economy', amount: 75 },
                            lore: 'The inheritance remains unclaimed. Perhaps another will be braver.'
                        }
                    ],
                    tags: ['choice', 'meta-chain', 'climax']
                }
            ],
            completionBonus: {
                research: 150,
                energy: 100,
                minerals: 100
            }
        },

        // Site 6: The Abandoned Colony - standalone site
        site_abandoned_colony: {
            id: 'site_abandoned_colony',
            name: 'The Forsaken Settlement',
            description: 'Ruins of a colony that shouldn\'t exist - built by a species that vanished before faster-than-light travel was possible.',
            layers: [
                {
                    title: 'Impossible Ruins',
                    narrative: `The colony predates spaceflight by two thousand years, yet here it sits on {PLANET_NAME}, lightyears from its builders' homeworld. The structures are intact but empty, as if the inhabitants simply vanished mid-day.

Food remains on tables, turned to dust. Personal effects lie undisturbed. Something took them all at once.`,
                    choices: [
                        {
                            text: 'Investigate the residential areas',
                            outcome: 'Personal journals describe normal life until the last entry: "The light came. Everyone is going outside."',
                            rewards: { research: 25 },
                            lore: 'The colonists went willingly. Something called them, and they answered.'
                        },
                        {
                            text: 'Examine the colonial center',
                            outcome: 'Records show the colony thrived for generations. They forgot they\'d traveled across stars - or were made to forget.',
                            rewards: { minerals: 30 },
                            lore: 'Memory modification on a massive scale. Someone wanted this colony isolated, innocent, waiting.'
                        }
                    ],
                    tags: ['mystery', 'colony']
                },
                {
                    title: 'The Temple',
                    narrative: `At the colony's heart stands a building unlike the others - alien architecture among human designs. Inside, symbols cover the walls, and a crystal altar dominates the chamber.

The colonists worshipped here. They worshipped something that answered.`,
                    choices: [
                        {
                            text: 'Study the religious symbols',
                            outcome: 'The faith was imposed, artificial. Designed to create dependency and prepare the colonists for... harvest.',
                            rewards: { research: 40 },
                            lore: 'The colonists were cattle. Fed, protected, and taken when ripe. The question is: by whom?'
                        },
                        {
                            text: 'Examine the crystal altar',
                            outcome: 'The crystal stores psychic residue. Thousands of minds, touching it over generations, leaving impressions.',
                            rewards: { research: 45 },
                            lore: 'The crystal holds fragments of their final moments. Joy. Anticipation. They believed they were ascending.',
                            consequences: { damage: 15 }
                        }
                    ],
                    tags: ['religion', 'horror']
                },
                {
                    title: 'The Truth Below',
                    narrative: `Beneath the temple, a vast chamber reveals the colony's true foundation. Massive biological structures web the ceiling - dormant now, but once they pulsed with stolen life.

This wasn't a colony. It was a farm.`,
                    choices: [
                        {
                            text: 'Document everything for the codex',
                            outcome: 'The horror is recorded. Others must know what stalks the spaces between stars.',
                            rewards: { research: 50 },
                            lore: 'Something cultivates sentient life across the galaxy. It plants seeds of civilization and returns to harvest.'
                        },
                        {
                            text: 'Destroy the biological structures',
                            outcome: 'The structures burn. Whatever they were, they won\'t function again.',
                            rewards: { energy: 60 },
                            lore: 'You\'ve destroyed the harvesting mechanism. But the harvesters themselves remain somewhere, hungry.'
                        }
                    ],
                    tags: ['revelation', 'horror']
                },
                {
                    title: 'The Warning',
                    narrative: `One final discovery: a hidden message, scratched into a wall by someone who remembered the truth.

"We were taken from Earth. Generations ago. They changed our memories, made us worship them. When they return, they will take everyone. They are not gods. They are hungry. WARN THE OTHERS."`,
                    choices: [
                        {
                            text: 'Preserve the warning',
                            outcome: 'The survivor\'s message is saved. Their sacrifice matters.',
                            rewards: { research: 40 },
                            lore: 'Humanity - or something like it - has been harvested before. It could happen again.'
                        },
                        {
                            text: 'Search for traces of the harvesters',
                            outcome: 'DNA samples remain. Not from the colonists - from their captors.',
                            rewards: { research: 60 },
                            techBonus: { category: 'subterfuge', amount: 40 },
                            lore: 'You have biological data on the harvesters. When they come, you\'ll recognize them.'
                        }
                    ],
                    tags: ['choice', 'warning']
                }
            ],
            completionBonus: {
                research: 60,
                minerals: 40
            }
        }
    }
};

export default ARCHAEOLOGY_SITES;
