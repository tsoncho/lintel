import type { CourseCopy } from "../types";

export const en: CourseCopy = {
  ui: {
    title: "Learn architecture",
    intro: "A short course for beginners. It teaches how to look at buildings, read simple drawings, and explain a design decision. It does not license you to build.",
    close: "Close",
    overview: "Overview",
    glossary: "Glossary",
    continue: "Continue learning",
    language: "Language",
    english: "English",
    bulgarian: "Български",
    duration: "Duration",
    aboutHours: "About 3 hours",
    minutesShort: "min",
    disclaimer: "These lessons teach vocabulary and ways of thinking. They are not a licence to design, calculate, or build. Simplified examples are not engineering advice. A real project needs local professionals wherever safety, structure, permits, or building rules are involved.",
    objectives: "Objectives",
    vocabulary: "Key terms",
    check: "Check",
    activity: "Activity",
    hint: "Hint",
    previous: "Previous",
    next: "Next",
    markComplete: "Mark lesson complete",
    completed: "Completed",
    done: "Done",
    progressLabel: "Course progress",
    searchLabel: "Search the glossary",
    searchPlaceholder: "Try plan, section, фасада, or разрез",
    noMatches: "No terms match that search.",
    reset: "Reset course progress",
    resetTitle: "Reset progress on this computer?",
    resetBody: "This clears lesson completion, answers, and notes for the course. It does not delete or change any building project.",
    resetConfirm: "Reset progress",
    cancel: "Cancel",
    reflectionPlaceholder: "Write a few sentences. Taste is not graded. A reason is.",
    reflectionShort: "Add a little more so the note records a reason, not only a word.",
    acknowledge: "I have done these steps in Lintel or followed them carefully on paper.",
    openPlan: "Open Courtyard Studio in plan",
    openModel: "Open Courtyard Studio in 3D",
    openSection: "Open Courtyard Studio in section",
    startPractice: "Start a practice project",
    actionNote: "If a project is open and unsaved, Lintel asks before replacing it. Course progress stays on this computer and is not written into the project file. The question itself uses the app's English dialog.",
    correctLabel: "Yes.",
    incorrectLabel: "Not quite.",
    backOverview: "Back to overview",
    paperLabel: "Note",
    modelLabel: "In Lintel",
    savedHere: "Progress is stored in this browser or desktop profile, not in a .lintel file, and it is not sent to a server.",
    missingLesson: "That lesson is no longer in the course. Your other saved progress was kept.",
    newerProgress: "Saved course progress is from a newer Lintel and was left unchanged. You can read the lessons, but this session will not record progress.",
    lessonForms: { one: "lesson", few: "lessons", many: "lessons" },
    moduleForms: { one: "module", few: "modules", many: "modules" },
    courseNav: "Course",
    lessonNav: "Lessons",
  },
  modules: {
    what: {
      title: "What architecture is",
      summary: "Buildings are answers to people, place, climate, culture, and resources. Design develops with other people, and the first drawing is rarely the last.",
      objectives: [
        "Explain a building as a response rather than only an object or a style.",
        "Name common project participants and the kind of question each one asks.",
      ],
    },
    drawings: {
      title: "Reading architectural drawings",
      summary: "Plans, elevations, and sections are different views of one building. Scale, north, dimensions, and symbols tell you how to read them.",
      objectives: [
        "Tell a floor plan, an elevation, and a section apart, and say what each one shows.",
        "Read orientation and real size in Lintel without confusing screen zoom with scale.",
      ],
    },
    space: {
      title: "Space and human needs",
      summary: "Rooms have purposes. How they touch, how people move, and how light, privacy, and access are handled shape a plan before any finish is chosen.",
      objectives: [
        "Describe room purpose, adjacency, and circulation in a small plan.",
        "Explain daylight, privacy, and accessibility as design aims, not as decoration.",
      ],
    },
    parts: {
      title: "The parts of a building",
      summary: "From the ground to the roof, each major part has a job. Lintel models some of those parts and deliberately leaves others out.",
      objectives: [
        "Identify site, foundation, structure, floors, walls, roof, openings, and finishes.",
        "Say which of those parts you can model in Lintel and which you can only discuss.",
      ],
    },
    standing: {
      title: "How buildings stand",
      summary: "Loads follow a path to the ground. Spans and structural systems are ideas you should recognise. A learning model does not calculate them.",
      objectives: [
        "Trace a simplified load path from a floor down to the ground.",
        "Explain a span, and why Lintel's walls are geometry rather than a structural design.",
      ],
    },
    materials: {
      title: "Materials and performance",
      summary: "Materials are chosen by tradeoff: strength, moisture, sound, heat, durability, cost, and the resources used to make them. No single material wins every time.",
      objectives: [
        "Name basic material properties and a tradeoff between two familiar materials.",
        "Describe the building envelope as the layer that meets weather, heat, and moisture.",
      ],
    },
    process: {
      title: "From idea to building",
      summary: "A project moves from a brief and a concept through iteration, coordination, documents, construction, and review. An early model is not a permit set.",
      objectives: [
        "Write the difference between a brief, a concept, and a later revision.",
        "Explain why drawings are coordinated and reviewed before anyone builds.",
      ],
    },
    capstone: {
      title: "Design a small building",
      summary: "You write a short brief, build or inspect a one-storey study model in Lintel, and explain one decision with a constraint and a tradeoff.",
      objectives: [
        "State a brief for a very small building and the limit you are willing to accept.",
        "Connect that brief to a plan, openings, and a 3D or section look, then reflect in writing.",
      ],
    },
  },
  lessons: {
    "buildings-respond": {
      title: "Buildings answer people and place",
      summary: "A building is a response to how people live, the ground it sits on, the climate, the culture around it, and the resources that can be used.",
      objectives: [
        "Describe a familiar room as a response to the people who use it.",
        "Name place, climate, culture, and resources as real limits on a design.",
      ],
      sections: [
        {
          heading: "More than an object",
          paragraphs: [
            "A house, a classroom, and a corner shop are all buildings, but they answer different lives. One makes room for cooking and sleep. Another holds a group that must see a teacher. A third needs a counter, storage, and a way for customers to enter without crossing the stock room.",
            "Architecture is the work of making those answers clear. It is not only the look of the front. A striking facade can still hide a room that is dark, hard to reach, or the wrong size for the people inside.",
          ],
        },
        {
          heading: "Place and means",
          paragraphs: [
            "The site is the ground and what surrounds it: sun, wind, slope, neighbours, and the path you arrive by. Climate asks for shade, warmth, or shelter from rain. Culture shapes which rooms are shared and which stay quiet. Resources decide what can actually be afforded and built.",
            "Lintel can hold walls, floors, openings, and rooms. It does not model weather, neighbours, or money. Those stay in your reasoning. That is why a drawing in this course is always paired with a sentence about who it is for.",
          ],
        },
      ],
      activity: {
        title: "A room you already know",
        instructions: "Think of a kitchen, a classroom, or a shop you use. Write who it is for and one way the room responds to them. A few sentences are enough. The note stays on this computer and is not sent anywhere.",
        steps: [
          "Name the room and the people who use it on an ordinary day.",
          "Name one feature that helps that use, such as a window, a wide door, or a quiet corner.",
        ],
        hint: "There is no single correct room. The note should show a person and a reason, not only a style word.",
      },
    },
    "how-design-develops": {
      title: "How a design develops",
      summary: "Architects listen, propose, and revise. They share the project with clients, engineers, builders, and reviewers. The first drawing is a test, not a verdict.",
      objectives: [
        "Separate an architect's question about use from an engineer's question about loads.",
        "Explain why changing a drawing after a new constraint is normal work.",
      ],
      sections: [
        {
          heading: "Several people, several questions",
          paragraphs: [
            "A client or a community says what the building must do and what it must not cost them in space, money, or disruption. An architect organises rooms, light, approach, and form so that purpose can be lived in. A structural engineer asks how weight reaches the ground. A builder asks how the pieces will be made and assembled.",
            "Officials ask whether local rules are met. On a small project one person may carry more than one of these roles, and real offices overlap. The useful habit is to notice which question you are answering. This course, and Lintel, do not replace any of those people.",
          ],
        },
        {
          heading: "A sequence, not a single picture",
          paragraphs: [
            "A concept is a direction, such as one workroom with the window toward the garden. A brief is the list of needs and limits that direction has to meet. Drawings test the direction. When a door lands in a private room, you move the door. The revision is the work.",
            "Later lessons ask you to say what you decided and what you gave up. Taste by itself is not the check. A reason that names a person, a limit, and a tradeoff is.",
          ],
        },
      ],
      activity: {
        title: "Three questions",
        instructions: "For a small house, name three participants and one question each would ask. Include someone other than the architect. Write the three questions in the note.",
        steps: [
          "Choose a client, an architect, and one more person, such as a builder or an engineer.",
          "Give each person a different question about use, structure, cost, or how the work gets built.",
        ],
        hint: "If all three questions are about furniture or colour, add one about structure, money, or rules.",
      },
    },
    "three-drawings": {
      title: "Plan, elevation, and section",
      summary: "Three ordinary drawings describe one building. A plan looks down, an elevation looks at a face, and a section cuts through.",
      objectives: [
        "Match plan, elevation, and section to the kind of cut or view each one is.",
        "Use Lintel's plan and section, and say honestly what the 3D view is not.",
      ],
      sections: [
        {
          heading: "Three ways of looking",
          paragraphs: [
            "A floor plan is a horizontal cut, usually about a metre above the floor, drawn as if you were looking straight down. You see room outlines, wall thickness, doors, and windows. You do not see how tall the room feels.",
            "An elevation is one outside face, seen straight on, without the vanishing lines of a perspective sketch. A section cuts vertically through the building and shows floors, wall heights, and openings stacked in height. Plan, elevation, and section are the same building, not three different designs.",
          ],
        },
        {
          heading: "What Lintel can show",
          paragraphs: [
            "Lintel draws a plan and can generate a section from a section line you place on that plan. The section shows cut walls, slabs, and openings, plus walls that sit within the view depth. It is a learning section, not a full construction drawing.",
            "The 3D view lets you orbit the same model and look at the outside. That is useful, and it is not a measured elevation sheet. Lintel does not yet produce elevation drawings, roofs, or stairs. If a lesson needs those, it says so and stays on paper.",
          ],
        },
      ],
      activity: {
        title: "Compare plan and section",
        instructions: "Open the sample and compare the plan with section A. You are checking that a section is a cut, not a picture of the facade. Your existing project is replaced only if you agree when Lintel asks.",
        steps: [
          "Open the sample in plan and find the line marked A crossing the building.",
          "Open the section view and name one thing you can see there that the plan does not show, such as a floor line or a window height.",
        ],
        hint: "The plan shows the cut from above. The section shows storeys stacked in height. The 3D view is a third way of looking, not an elevation sheet.",
      },
    },
    "scale-and-symbols": {
      title: "Scale, north, and symbols",
      summary: "A drawing is readable when you know its size, its orientation, and what its marks mean. In Lintel the building is stored in millimetres and north is up.",
      objectives: [
        "Explain the difference between screen zoom and the real size of a wall.",
        "Use north and a gridline to describe where something sits in the plan.",
      ],
      sections: [
        {
          heading: "Size and orientation",
          paragraphs: [
            "Scale is the relationship between a length on paper and the same length in the building. A classroom plan might be drawn much smaller than the room, but a dimension still states the true length. Zooming a screen is not that relationship. It only makes the view larger or smaller.",
            "In Lintel, distances are stored in millimetres. You can display them in metres, and the model does not rescale. Plan X increases to the east and Y increases to the north, so north is toward the top of the plan. Select a wall and its length stays the same when you zoom.",
          ],
        },
        {
          heading: "Marks that stand for agreements",
          paragraphs: [
            "A dimension is a measured length. A gridline is a named reference, such as A or 1, so people can say \"the wall on grid 2\" instead of pointing. A door swing is a symbol for how the leaf opens. It is not the door's thickness.",
            "In the section view, a wall the cut passes through is drawn solid and dark. A wall only seen beyond the cut is lighter, and an opening is left as a gap. Those are reading conventions for this app. A printed set of drawings uses a fuller set of line weights, which Lintel does not claim to reproduce.",
          ],
        },
      ],
      activity: {
        title: "Zoom does not resize the wall",
        instructions: "Open the sample plan. Read one wall length, zoom in and out, and find a gridline. North stays at the top. This checks orientation and real size, not your taste.",
        steps: [
          "Select a wall and read its length in properties. Zoom in, then out, and confirm the length does not change.",
          "Find grid A and grid 1, and say which edge of the plan is north.",
        ],
        hint: "North is the top of the plan in Lintel. Grid 2 is the north side of the sample. Zoom changes the view, not the millimetres.",
      },
    },
    "rooms-and-movement": {
      title: "Rooms and the paths between them",
      summary: "Each room has a job. Adjacency decides which jobs should touch. Circulation is the path people actually walk, and it should be designed rather than left over.",
      objectives: [
        "Give two rooms a reason to be adjacent and two a reason to stay apart.",
        "Describe circulation as a sequence of doors and paths, not as empty space.",
      ],
      sections: [
        {
          heading: "Purpose and neighbours",
          paragraphs: [
            "A room is a piece of space with a purpose: sleep, cook, sell, teach, wash, store. The purpose suggests a size, a door, and often a window, but the neighbours matter as much as the size. A bedroom beside a quiet court is a different room from a bedroom that opens onto a shop counter.",
            "Adjacency is the choice of who shares a wall or a door. Cooking often wants to be near eating. Sleep often wants to be away from the entrance and the street. There is no universal diagram. There is a diagram for these people, on this site.",
          ],
        },
        {
          heading: "Do not leave the path to chance",
          paragraphs: [
            "Circulation is how a person gets from the outside to each room and back. It can be a hall, a gallery, or simply a sequence of doors. If every room is only reachable by crossing a bedroom, the bedroom has become a corridor and has lost its quiet.",
            "In a small plan, draw the walk before you decorate. Lintel can show walls, doors, and a room outline. It will not tell you that the path is clumsy. That judgment stays with you, which is what the note in this lesson is for.",
          ],
        },
      ],
      activity: {
        title: "Two rooms that should touch",
        instructions: "For a small home, name two rooms that should be adjacent and two that should not. Give a reason for each pair. You are practising adjacency, not drawing a final plan.",
        steps: [
          "Write one pair that should share a door or a short path, and why.",
          "Write one pair that should stay apart, and what goes wrong if they touch.",
        ],
        hint: "A reason names the activity, such as cooking, sleep, or arriving. \"I like it\" is not yet a reason.",
      },
    },
    "comfort-and-access": {
      title: "Light, privacy, and access",
      summary: "Daylight, privacy, and accessibility decide whether a room is pleasant and usable. They are aims to discuss early, and this course does not turn them into code numbers.",
      objectives: [
        "Explain what a window gives and what it costs, beyond being a symbol on a plan.",
        "Describe accessibility as who can enter and use a place, including people who cannot use steps.",
      ],
      sections: [
        {
          heading: "Light and being seen",
          paragraphs: [
            "Daylight is light from the sun and sky. A window brings it in, and also a view, heat in summer, heat loss in winter, and a way to be seen from outside. Privacy is how well a room is sheltered from views, noise, and unwanted entry. A window on the street and a window on a garden are not the same decision.",
            "Comfort is broader than temperature. A room can be bright and still feel exposed, or quiet and still be gloomy. Lintel can place a window and show it in 3D. It does not calculate daylight, glare, or heat. Use the model to see where the opening is, then reason about the rest.",
          ],
        },
        {
          heading: "Who can use the room",
          paragraphs: [
            "Accessibility means more people can arrive, enter, and use the place. A step at the only door excludes someone who cannot climb it. A path that is too narrow, or a door that does not leave room to turn, does the same even when the room beyond is pleasant.",
            "This lesson does not quote a local code and does not give a minimum width to memorise. Real projects must follow the rules of their place, checked by people who practise there. Here, the habit is to ask who is left out before you call a plan finished.",
          ],
        },
      ],
      activity: {
        title: "Look at an opening in 3D",
        instructions: "Open the sample in 3D and find a window. Notice which way it faces and which room it serves. You are connecting a plan symbol to light and view. Lintel will not score the window.",
        steps: [
          "Open the 3D view and find one window on the outside of the sample.",
          "In a sentence you can say aloud, name what that window might be for: light, view, or both, and what it gives up, such as privacy.",
        ],
        hint: "The sample is an illustration. A higher sill is typical of a window and a door usually starts at the floor, but those are not rules for every building.",
      },
    },
    "site-to-roof": {
      title: "From the ground to the roof",
      summary: "A building is a stack of jobs: stay put on the ground, carry weight, make floors, enclose weather, and shed rain. Lintel models only part of that stack.",
      objectives: [
        "Give the basic job of a foundation, a floor, a wall, and a roof.",
        "List the parts Lintel can model and the parts it leaves for discussion only.",
      ],
      sections: [
        {
          heading: "A stack of jobs",
          paragraphs: [
            "The site is where the building meets land, access, and neighbours. The foundation passes weight into the ground so the building does not sink or slide in an uncontrolled way. Floors, often slabs in a simple building, give you a surface to stand on. Walls enclose or divide. The roof sheds water and completes the shelter.",
            "Stairs connect storeys when a building has more than one level you must walk between. Structure is the set of parts that do the carrying, and it may be the walls themselves or a frame of columns and beams. Naming the job is the point of this lesson. Sizing the part is not.",
          ],
        },
        {
          heading: "What the model includes",
          paragraphs: [
            "Lintel models storeys, straight walls, slabs, doors, windows, rooms, and a section through that geometry. It does not model the site, the foundation, the roof, or stairs. A material name on a wall is a label, not a layered assembly.",
            "When you talk about a roof or a foundation in this course, you are reasoning, not pretending the model has those objects. The activity asks you to sort the list. That honesty matters more than a diagram that implies the software checked the ground.",
          ],
        },
      ],
      activity: {
        title: "Sort the parts",
        instructions: "This is a paper exercise. Lintel cannot place a foundation or a roof, so do not look for those tools. Write two short lists in the note.",
        steps: [
          "List parts you can model now: storeys, walls, slabs, doors, windows, rooms, and a section.",
          "List parts you can only discuss: site, foundation, roof, and stairs, and give each its job in a few words.",
        ],
        hint: "A slab in the model is a floor plate. It is not a foundation, and it is not proof that the ground can carry the building.",
      },
    },
    "openings-and-finishes": {
      title: "Openings, partitions, and finishes",
      summary: "Doors and windows are openings with different jobs. An exterior wall encloses. A partition divides the inside. Finishes are what you touch, and they are not the structure.",
      objectives: [
        "Tell an enclosing wall from an interior partition.",
        "Explain a door, a window, and a lintel without treating a material name as a specification.",
      ],
      sections: [
        {
          heading: "Holes with jobs",
          paragraphs: [
            "An opening is a gap in a wall. A door is an opening people pass through, usually starting at the floor. A window is an opening for light, view, and air, often with a sill above the floor. Both weaken the wall they sit in, which is why something has to span the top.",
            "A lintel is that short span over an opening, called щурц in Bulgarian. The app is named for the idea of a piece that carries what is above a gap. Lintel does not draw that beam as its own object. The opening is cut in the wall, and the structural piece remains a concept you should be able to name.",
          ],
        },
        {
          heading: "Enclosure, division, and surface",
          paragraphs: [
            "An exterior wall is part of the enclosure: it separates inside from weather. A partition is an interior wall whose main job is to divide rooms. In a real building some walls also carry load and some do not. Lintel does not know the difference. Every wall in the model is geometry until a person decides otherwise.",
            "Finishes are the surfaces you see and touch: plaster, paint, flooring, tile. They can change the feel and the durability of a room without changing the load path. In Lintel a wall's material field is a name such as Brick or Stud. It does not describe coats, insulation, or a tested build-up.",
          ],
        },
      ],
      activity: {
        title: "Compare a door and a window",
        instructions: "Open the sample plan, select a door, then a window, and compare width and sill in properties. You are reading the model, not approving it for construction.",
        steps: [
          "Select the entrance door and note its sill and height.",
          "Select a window and note how its sill differs. Say, in your own words, what each opening is for.",
        ],
        hint: "In the sample the door sill is at the floor and the windows sit higher. Treat that as an illustration of the sample, not as a code minimum.",
      },
    },
    "loads-and-paths": {
      title: "Loads and the path to the ground",
      summary: "Weight has to go somewhere. A load path is the route from the place the weight starts to the ground. This is a teaching sketch, not a calculation.",
      objectives: [
        "Distinguish the weight of the building from the weight of people and furniture, in plain words.",
        "Trace a simplified path from a floor to the foundation, and state that Lintel does not calculate it.",
      ],
      sections: [
        {
          heading: "What a load is",
          paragraphs: [
            "A load is a force the building has to resist. Dead load is the weight of the building itself: floors, walls, roof. Live load is the weight that comes and goes: people, furniture, snow on a roof, wind against a wall. Even this split is a simplification used for teaching.",
            "Nothing in this lesson tells you a number to build with. Numbers belong to a project, a place, and an engineer. If you remember only one caution, remember that a clear diagram is not a structural design.",
          ],
        },
        {
          heading: "A path, not a magic disappearance",
          paragraphs: [
            "A load path is the route the force follows. In a simple house it might run from the floor slab into a wall, down that wall into the foundation, and from the foundation into the ground. If a piece is missing, the load does not vanish. It finds another route, sometimes by cracking something you did not intend.",
            "Lintel will not find that route for you. Its walls have height and thickness so you can see and edit them. Those fields are not a check of strength. The activity is a sentence you write, not a result the software certifies.",
          ],
        },
      ],
      activity: {
        title: "Say the path aloud",
        instructions: "On paper, trace an imaginary path for the weight of a floor in a one-storey room. Lintel has no load command, and this note is not engineering advice.",
        steps: [
          "Start at the floor and name the next part the weight enters, such as a wall.",
          "End at the ground, and include the foundation even though the model does not have one.",
        ],
        hint: "A complete sentence names floor, wall, foundation, and ground. Stopping at the wall leaves the load in the air.",
      },
    },
    "spans-and-systems": {
      title: "Spans and simple systems",
      summary: "A span is the distance between supports. Walls, frames, and lintels are different ways of crossing or carrying that distance. The learning model does not choose among them.",
      objectives: [
        "Define a span and say why a longer one is generally harder to cross.",
        "Explain that a wall in Lintel is not labelled as load-bearing or non-load-bearing by the software.",
      ],
      sections: [
        {
          heading: "The distance between supports",
          paragraphs: [
            "A span is the clear distance a floor, a beam, or a lintel crosses between supports. A short span over a doorway is a different problem from a floor that crosses a whole hall with no wall in the middle. Longer spans usually want deeper structure, more material, or supports brought closer together.",
            "That is a tendency, not a formula and not a ban on large rooms. A hall can be the right room. It simply should not be drawn as if the floor were free. This course will not size a beam. It asks you to notice when a drawing has created a span someone else must design.",
          ],
        },
        {
          heading: "Systems, simplified",
          paragraphs: [
            "A bearing wall carries load from above as well as dividing space. A partition mainly divides. A frame of columns and beams can carry the load while the walls hang as enclosure. Real systems mix these ideas, and the choice depends on the spans, the openings, and the place.",
            "Lintel draws every wall the same way. Nothing in the file marks a wall as bearing. Do not read a thick wall in the sample as a structural design. The thickness is a modeling parameter. An engineer, not the course, decides what may carry load.",
          ],
        },
      ],
      activity: {
        title: "Name a span you can see",
        instructions: "This stays on paper because Lintel has no span or structure tool. Use a doorway you know, or the idea of a lintel over a window.",
        steps: [
          "Name the opening and what has to span across the top of it.",
          "Say why you would not treat that span as \"already solved\" just because a wall is drawn in a model.",
        ],
        hint: "The word to include is lintel or beam, plus the idea that the model did not calculate it.",
      },
    },
    "choosing-materials": {
      title: "Choosing materials",
      summary: "A material is a bundle of properties and consequences. Strength, weight, moisture, fire, appearance, cost, and the resources used to make it rarely point to one winner.",
      objectives: [
        "List at least four properties that can matter when a material is chosen.",
        "Explain why a material name in Lintel is a label, not a specification.",
      ],
      sections: [
        {
          heading: "Properties, not personalities",
          paragraphs: [
            "Materials differ in strength, weight, how they meet water and fire, how easy they are to shape, how they look and age, what they cost, and how much energy and raw material went into them. A heavy wall may store heat and also be slow and costly to build. A light wall may go up quickly and feel thin to sound.",
            "There is no best material in the abstract. Brick, timber, concrete, and glass each solve some problems and create others. The sample project uses names such as Brick, Stud, and Concrete so the model is readable. Those names are not a recommendation and not a tested wall type.",
          ],
        },
        {
          heading: "A name is not a build-up",
          paragraphs: [
            "A specification describes layers, thicknesses, fixings, and the standard they are built to. A single word in a property field does none of that. Insulation, a vapour layer, and an exterior skin can sit inside what a drawing casually calls one wall.",
            "When you choose in this course, write the tradeoff in a sentence: what you gain, and what you accept. Lintel will store the word you type. It will not check moisture, fire, or embodied resources. That gap is part of the lesson.",
          ],
        },
      ],
      activity: {
        title: "Read a material name",
        instructions: "Open the sample plan, select a wall, and read its material. Then write why that word is not yet a decision you could hand to a builder.",
        steps: [
          "Select an exterior wall and read the material name in properties.",
          "In your own words, name one thing the label does not tell you, such as insulation, cost, or how it meets rain.",
        ],
        hint: "Name a missing layer or a missing performance, such as rain or sound. The word Brick does not specify them.",
      },
    },
    "comfort-envelope": {
      title: "The envelope and comfort",
      summary: "The envelope is the outside skin. Heat, moisture, sound, and time all pass through it in ways a simple model will not simulate.",
      objectives: [
        "Define the building envelope and one way heat or moisture moves through it.",
        "Separate comfort reasoning from what Lintel is able to display.",
      ],
      sections: [
        {
          heading: "A skin, not a line",
          paragraphs: [
            "The building envelope is the roof, outside walls, windows, and ground floor acting together as the boundary between indoors and weather. A line on a plan is the location of that boundary. It is not the layers that make the boundary work.",
            "Heat moves through materials and, much faster, through glass and gaps. Moisture can wet a wall from rain or from damp air that condenses on a cold surface. Neither effect appears in Lintel. If you add a window for daylight, you have also made a decision about heat and about being seen.",
          ],
        },
        {
          heading: "Sound, wear, and upkeep",
          paragraphs: [
            "A thin partition stops a view and rarely stops a voice. Sound control is its own design problem, with mass, separation, and seals. This course does not give ratings. It asks you not to assume that a drawn wall is a quiet wall.",
            "Durability is how a material survives water, sun, knocks, and time, and it still needs maintenance. A tough surface in a hallway and a soft surface in a bedroom can both be right. Write the place and the threat, not a slogan about quality.",
          ],
        },
      ],
      activity: {
        title: "One comfort problem you have felt",
        instructions: "Describe one real room that was too cold, too hot, too noisy, or too dark. Name the part of the envelope or the partition involved. This is a reflection, not a diagnosis.",
        steps: [
          "Name the room and the problem as you felt it.",
          "Guess, and mark it as a guess, which part was involved: window, outside wall, roof, or a thin partition.",
        ],
        hint: "Start with \"I am guessing.\" The course does not want a fake certainty about a building you have not inspected.",
      },
    },
    "brief-and-options": {
      title: "Brief, concept, and revision",
      summary: "A brief says who and what. A concept is a direction. Iteration is what you do when the direction misses a constraint. None of these is a rendering.",
      objectives: [
        "Write a four-part brief: people, activities, a constraint, and what success looks like.",
        "Show one revision you would make when the first idea fails the brief.",
      ],
      sections: [
        {
          heading: "The brief before the picture",
          paragraphs: [
            "A brief is a statement of the project in words. Who is it for? What must they be able to do? What is limited: size, budget, an existing tree, a shared wall? What would make the result a success for those people? Without that, a plan is only a shape.",
            "A picture can still be useful. It is not a substitute for the brief. A beautiful view of a studio that has no place to store a bicycle has ignored a need. Write the need down before you fall in love with the first rectangle.",
          ],
        },
        {
          heading: "Change is a tool",
          paragraphs: [
            "A concept organises the brief: \"work at the north light, wash and entry to the south.\" You test it by drawing. If the only window faces a neighbour's wall, the concept has met a fact. You move the window, the room, or the concept.",
            "Iteration is that loop. It is not indecision. Professionals keep the versions that explain why the plan changed. In this course a short note is enough: what you tried, what failed, what you did next.",
          ],
        },
      ],
      activity: {
        title: "Four lines for one person",
        instructions: "Write a brief for a one-room workspace for one person. Keep it to a short paragraph that still covers who, what they do, one limit, and what success means.",
        steps: [
          "Name the person and the main activity, such as drawing, reading, or meeting one visitor.",
          "Add one constraint, such as a small footprint or a need for quiet, and one sentence on what would make the room work.",
        ],
        hint: "If the note could describe any room in the world, add the constraint. A limit is what makes it a brief.",
      },
    },
    "drawing-to-site": {
      title: "From drawings to a building",
      summary: "Other people have to understand, check, and build the work. An early model coordinates ideas. It is not a permit, a contract, or a structural calculation.",
      objectives: [
        "Name coordination, documentation, construction, and review as stages after a concept.",
        "State one thing a builder still needs that Lintel does not provide.",
      ],
      sections: [
        {
          heading: "Drawings are messages",
          paragraphs: [
            "Coordination means the plan, the structure, the services, and the site agree with each other. A drain that crosses a beam, or a door that swings into a stair, is a coordination problem. Documentation is the set of drawings and notes other people can build and check from.",
            "Lintel keeps one geometric model and can show it as a plan, a 3D view, and a section. That is a strong way to keep those views matched. It is still an early model. It has no sheets, schedules, roof, stairs, or notes about how to build a joint.",
          ],
        },
        {
          heading: "Construction and review",
          paragraphs: [
            "Construction is the work on site: sequence, weather, safety, and the difference between a line and a material you can buy. Review happens before building, when someone checks safety and rules, and during building, when the site reveals a condition the drawing missed.",
            "Nothing in this app approves a project. Local professionals do that where structure, fire, access, or permits are involved. The activity asks for one missing piece a builder would notice. Naming the gap is a skill.",
          ],
        },
      ],
      activity: {
        title: "What a builder still needs",
        instructions: "Look at what Lintel shows, then write one thing a builder would still need before constructing a small studio. Foundations, roofs, and written dimensions on a sheet are all fair answers.",
        steps: [
          "Pick one missing piece: foundation, roof, stairs, or a dimensioned sheet another trade can price.",
          "Say why the 3D view does not replace that piece.",
        ],
        hint: "A good answer names the missing information and the person who needs it, such as a builder or an engineer.",
      },
    },
    "capstone-brief": {
      title: "Write the brief",
      summary: "The capstone is a one-storey study building with two spaces. You start with a brief, including one constraint and one tradeoff you accept.",
      objectives: [
        "Describe the users, two spaces, and one constraint for a tiny building.",
        "State a tradeoff in words before you open a model.",
      ],
      sections: [
        {
          heading: "A building small enough to finish",
          paragraphs: [
            "You are designing a one-storey place for one or two people. Give it two spaces, such as a workroom and an entry, or a reading room and a place to wash. It can be a studio, a kiosk, or a club room. It does not need a staircase, a roof plan, or a second floor.",
            "Keep it inside what you can draw with straight walls, a door, a window, and a room. If your idea needs a stair or a curved wall, change the idea. The limit is part of the lesson, and it matches what Lintel can actually model.",
          ],
        },
        {
          heading: "Decide what you will give up",
          paragraphs: [
            "A constraint is a limit you did not invent for drama: a small footprint, a need for quiet, a window that should not face the street, or a door that must be step-free in intention. A tradeoff is what you accept because of that limit. A quiet room may take less of the view. A large window may cost privacy.",
            "Write this before modeling so the model serves the brief. You can revise the brief later. If you do, say what changed. The note is not marked right or wrong. It is complete when a stranger could tell who the building is for and what you refused to ignore.",
          ],
        },
      ],
      activity: {
        title: "Brief for the study building",
        instructions: "Write the brief in the note: users, two spaces, one constraint, and one tradeoff. Do not start the model until this exists. Nothing here is graded as good taste.",
        steps: [
          "Name who uses the place and what the two spaces are for.",
          "Add one constraint and one tradeoff you are willing to accept because of it.",
        ],
        hint: "A tradeoff has two sides. \"More window\" is a wish. \"More window, less privacy from the street\" is a tradeoff.",
      },
    },
    "capstone-plan": {
      title: "Draw the plan",
      summary: "Build a new practice project, or study the same steps in the sample. The course will not overwrite a project until you confirm, and it never stores your notes inside the file.",
      objectives: [
        "Place a closed set of walls, a door, and a window in a new project or recognise them in the sample.",
        "Explain where course progress is stored, and that the sample is not your capstone file.",
      ],
      sections: [
        {
          heading: "A new file, not a silent edit",
          paragraphs: [
            "Start a practice project when you are ready to draw. Lintel asks before it replaces an open project that has unsaved work. That question is the app's usual leave dialog, in English. Cancel it if you meant to keep the other file. Course answers and notes stay in this profile either way.",
            "Courtyard Studio is a separate sample you can open to look. It is not your capstone, and saving over it is a different file from the practice project. If you only have time to study, follow the steps on the sample and say so. Do not pretend the sample is a building you designed.",
          ],
        },
        {
          heading: "Walls, then openings, then a room",
          paragraphs: [
            "Choose Wall and click two points for each wall until four walls meet at the corners. Corners clean up when ends fall within a short tolerance. Choose Door and click a wall, then Window and click another wall. Put them where your brief said entry and light should be.",
            "Find rooms on this story lists closed spaces and creates a room only if you confirm. If the outline is open, the tool says so instead of inventing a room. Optional: place a section line and look at the cut. None of this checks structure, energy, or code.",
          ],
        },
      ],
      activity: {
        title: "Practice project or sample study",
        instructions: "Draw the study building in a new practice project, or follow the same observations in Courtyard Studio. Tick the box only after you have actually looked. The checkbox is your record, not a grade.",
        steps: [
          "Start a practice project, or open the sample if you are studying rather than drawing. Agree only if you mean to leave the current file.",
          "Make or find a closed wall loop, one door, and one window. Optionally use Find rooms and confirm a room only if the outline looks right.",
        ],
        hint: "North is up. If the window faces the opposite way from your brief, that is a useful revision, not a failure.",
      },
    },
    "capstone-review": {
      title: "Review the decision",
      summary: "Look at the model in 3D or section and write the decision, the constraint, and the tradeoff. This reflection is the close of the course, not a professional review.",
      objectives: [
        "Explain one design decision with a reason, a constraint, and a tradeoff.",
        "State the difference between Lintel's 3D view and a measured elevation, and who reviews a real building.",
      ],
      sections: [
        {
          heading: "Look, then say why",
          paragraphs: [
            "Open the 3D view of whatever you drew, or of the sample if that is what you studied. Walk around it. Check that the door and the window match the sentence you wrote in the brief. If they do not, either change the model or change the sentence and admit the change.",
            "A section, if you placed one, shows the cut through walls and floors. If you did not place one, you can add it from the Section tool: two clicks for the line, then open the section view. The view updates when the model changes. It still omits roofs, stairs, and anything the model does not contain.",
          ],
        },
        {
          heading: "What this course will not sign",
          paragraphs: [
            "The 3D view shows the outside of the model. It is not an elevation drawing with measured heights and notes. Calling it a facade design overstates it. An elevation, when you need one for real, is a drawing someone dimensions and checks.",
            "You are finished with the course when you can explain the decision to another person. You are not finished with a building. Safety, structure, access, energy, and permits belong to local professionals and the rules of the place. Keep the note. It is yours, on this computer, and it is not a certificate.",
          ],
        },
      ],
      activity: {
        title: "Decision, constraint, tradeoff",
        instructions: "Write one decision, the constraint that shaped it, and the tradeoff you accepted. Then name one thing you would change after seeing the model in 3D. This is not marked right or wrong.",
        steps: [
          "Use the 3D view of your practice project or of the sample, and look at the door and a window together.",
          "Write the decision, the constraint, the tradeoff, and one change you would try next.",
        ],
        hint: "A complete note can be four short sentences. Include a limit, not only a preference.",
      },
    },
  },
  quizzes: {
    "buildings-q1": {
      prompt: "Which description best fits a building, as this course uses the word?",
      choices: {
        "people-place": "A response to people, place, climate, culture, and the resources available",
        ornament: "A collection of fashionable shapes chosen before anyone asks who will use it",
        software: "Whatever a modeling program happens to draw first",
      },
      correct: "The drawing matters because it answers a life and a place. Style can support that answer, but it is not the whole definition.",
      incorrect: "A style or a software view can be part of the work. The course starts from people, place, climate, culture, and resources.",
    },
    "architects-q1": {
      prompt: "How does a design usually develop?",
      choices: {
        unchanged: "The first drawing is kept unchanged so the concept stays pure",
        revise: "Ideas are tested against constraints and revised when they fail",
        software: "The software decides, and the people follow the first result",
      },
      correct: "Revision is the work. A concept is a direction you test, not a picture you are forbidden to touch.",
      incorrect: "The first drawing is a test. People change it when a constraint, such as privacy or structure, shows a problem.",
    },
    "drawings-q1": {
      prompt: "Which drawing looks straight down and shows rooms as if the building were cut horizontally?",
      choices: {
        plan: "A floor plan",
        elevation: "An elevation of one outside face",
        sketch: "A perspective sketch with vanishing lines",
      },
      correct: "A floor plan is a horizontal cut seen from above. It shows layout, not the feeling of height.",
      incorrect: "An elevation is a face seen straight on. A perspective sketch shows depth. The downward cut is the floor plan.",
    },
    "drawings-q2": {
      prompt: "Which drawing cuts through the building so floors and wall heights show together?",
      choices: {
        section: "A section",
        plan: "A floor plan",
        elevation: "An elevation",
      },
      correct: "A section is a vertical cut. Lintel can generate one from a section line, and it only shows what the model contains.",
      incorrect: "The plan is the horizontal cut. The elevation is the outside face. The vertical cut is the section.",
    },
    "scale-q1": {
      prompt: "In Lintel, what stays true when you zoom the plan?",
      choices: {
        zoom: "Zooming changes the real length stored for the walls",
        millimetres: "Lengths stay stored in millimetres; zoom only changes how large the view looks",
        north: "North moves from the top of the plan to the left",
      },
      correct: "Zoom is a view control. The model stays in millimetres, and north stays toward the top.",
      incorrect: "Zoom does not rescale the building or move north. The stored lengths remain millimetres.",
    },
    "rooms-q1": {
      prompt: "What is circulation in a floor plan?",
      choices: {
        circulation: "The way people move between rooms and to the outside",
        colour: "The colour chosen for the walls",
        furniture: "The list of furniture in a catalogue",
      },
      correct: "Circulation is the path. If the only path crosses a room that needed quiet, the plan has spent that room as a corridor.",
      incorrect: "Colour and furniture can matter later. Circulation is the path people walk.",
    },
    "comfort-q1": {
      prompt: "What does accessibility mean in this course?",
      choices: {
        use: "Thinking about who can enter and use a place, including people who cannot climb steps",
        facade: "Choosing a more expensive front for the building",
        furniture: "Adding more furniture so the room looks complete",
      },
      correct: "The question is who can arrive and use the room. This lesson does not replace the access rules of a particular place.",
      incorrect: "Costly finishes and extra furniture do not answer who can enter. Accessibility is about use, including people who cannot use steps.",
    },
    "parts-q1": {
      prompt: "What is the basic job of a foundation?",
      choices: {
        foundation: "To pass the building's load into the ground",
        paint: "To decorate the rooms people see",
        swing: "To show how a door leaf opens on the plan",
      },
      correct: "The foundation is how the load meets the ground. Lintel does not model it, so the idea stays in words.",
      incorrect: "Paint is a finish, and a door swing is a symbol. The foundation carries load into the ground.",
    },
    "openings-q1": {
      prompt: "What is the main job of an interior partition?",
      choices: {
        partition: "To divide interior space",
        foundation: "To carry the whole building into the ground",
        grid: "To name a gridline on the plan",
      },
      correct: "A partition divides rooms. It might also carry load in a real building, but Lintel does not decide that for you.",
      incorrect: "The foundation meets the ground, and a gridline is a reference. A partition's main job here is to divide inside space.",
    },
    "loads-q1": {
      prompt: "What is a load path?",
      choices: {
        path: "The route by which weight reaches the ground",
        colour: "The colour of a chosen material",
        scale: "The scale printed on a drawing",
      },
      correct: "Follow the load from the floor, through whatever carries it, to the foundation and the ground. The diagram is not a calculation.",
      incorrect: "Colour and scale are other topics. A load path is the route of the weight down to the ground.",
    },
    "loads-q2": {
      prompt: "What does Lintel do with loads?",
      choices: {
        geometry: "It does not calculate them. Walls and slabs are geometry for learning and early design.",
        permit: "It sizes members so the file can be permitted",
        code: "It checks the project against the local building code",
      },
      correct: "Thickness and height let you see the model. They are not a strength check, a permit, or a code review.",
      incorrect: "Lintel does not size structure and does not check a local code. The model is geometry.",
    },
    "spans-q1": {
      prompt: "What is a span, as this lesson uses the word?",
      choices: {
        span: "The distance a floor, beam, or lintel crosses between supports",
        paint: "The paint or other finish on a wall",
        north: "The north arrow on a plan",
      },
      correct: "A longer span is generally a harder structural problem. Noticing the span is not the same as designing the member.",
      incorrect: "Paint is a finish and north is orientation. A span is the distance between supports.",
    },
    "materials-q1": {
      prompt: "How should you treat a choice of material?",
      choices: {
        tradeoff: "As a tradeoff among properties such as strength, moisture, cost, and resources used",
        "always-brick": "As always brick, because the sample wall is named Brick",
        name: "As finished once a wall in the model has any material name",
      },
      correct: "Each material gives something and costs something else. The sample names are labels, not a winner or a specification.",
      incorrect: "Brick in the sample is a label, and typing a name does not specify layers or performance. The choice is a tradeoff.",
    },
    "envelope-q1": {
      prompt: "What is the building envelope?",
      choices: {
        envelope: "The outside assembly that separates indoors from weather",
        furniture: "The furniture layout inside the rooms",
        grid: "The lettered and numbered grid used to locate walls",
      },
      correct: "Roof, outside walls, and windows all take part. A line on the plan only marks where that boundary sits.",
      incorrect: "Furniture and gridlines organise the inside and the drawing. The envelope is the boundary with the weather.",
    },
    "brief-q1": {
      prompt: "What is a brief during a project?",
      choices: {
        brief: "A statement of who the building is for, what it must do, and which limits matter",
        picture: "A finished perspective picture of the outside",
        licence: "A professional licence to construct the building",
      },
      correct: "The brief is words before, and beside, the drawings. A picture can illustrate it and cannot replace it.",
      incorrect: "A rendering is a view, and this course is not a licence. A brief states people, purpose, and limits.",
    },
    "process-q1": {
      prompt: "What is a Lintel project file, in this course?",
      choices: {
        early: "An early design model, not a permit set and not a structural calculation",
        permit: "A document a city can permit without further review",
        proof: "Proof that the walls are strong enough to build",
      },
      correct: "Plan, 3D, and section stay matched because they read one model. That model still lacks the documents and checks a real project needs.",
      incorrect: "Opening a file does not permit it or prove strength. It is an early model you can revise and explain.",
    },
    "capstone-brief-q1": {
      prompt: "What does a clear design decision include?",
      choices: {
        reason: "A reason, a constraint, and a tradeoff",
        taste: "Only the words \"I like it\"",
        software: "Whatever the software draws on the first click",
      },
      correct: "The capstone asks for those three. Taste can be included, and it is not enough on its own.",
      incorrect: "Liking the shape, or accepting the first click, skips the limit. Name a reason, a constraint, and a tradeoff.",
    },
    "capstone-plan-q1": {
      prompt: "Where does your course progress live?",
      choices: {
        separate: "On this computer, separate from the building file",
        inside: "Inside the project file, replacing the walls if you complete a lesson",
        server: "On an external server that scores the design",
      },
      correct: "Answers and notes stay in this profile. Starting a practice project never writes them into the .lintel file.",
      incorrect: "Lessons do not edit your building by themselves, and nothing is uploaded. Progress is local and separate from the project.",
    },
    "capstone-review-q1": {
      prompt: "What is Lintel's 3D view, compared with an elevation?",
      choices: {
        view: "A way to look at the outside of the model, not a measured elevation drawing",
        sheet: "A finished elevation sheet with dimensions and notes for construction",
        permit: "A building permit for the outside of the project",
      },
      correct: "Orbiting the model helps you see the openings. An elevation drawing, with measured heights, is a document this version does not make.",
      incorrect: "The 3D view is not a dimensioned elevation and not a permit. It is a view of the same model.",
    },
    "capstone-review-q2": {
      prompt: "Before a real building is constructed, who reviews safety, structure, and rules?",
      choices: {
        professionals: "Local professionals, under the rules of that place",
        course: "This course, once every lesson is marked complete",
        itself: "The model, which approves itself when the walls meet",
      },
      correct: "Completing the course means you can explain a small decision. It does not approve a building.",
      incorrect: "A finished lesson list or a closed set of walls is not a review. Real projects need local professionals where safety and rules matter.",
    },
  },
  glossary: {
    architecture: "The work of shaping buildings for people, a place, a climate, and the means available to build.",
    site: "The ground a building sits on, together with sun, access, slope, and the neighbours around it.",
    story: "One level of a building. In Lintel a storey has a floor elevation and a height up to the next level.",
    plan: "A drawing that looks straight down after a horizontal cut, showing rooms, walls, and openings.",
    elevation: "A drawing of one outside face, seen straight on, without the vanishing lines of a perspective sketch.",
    section: "A drawing made by cutting through a building so floors, walls, and heights can be read together.",
    scale: "The relationship between a length on a drawing and the same length in the real building.",
    north: "The direction used to read sun and site. In Lintel, north is toward the top of the plan.",
    dimension: "A measured length. Lintel stores dimensions in millimetres even when you display metres.",
    gridline: "A named reference line, such as A or 1, used to locate walls and to talk about the plan.",
    room: "A space with a purpose, such as cooking, sleeping, selling, or gathering.",
    circulation: "The paths people use to move from outside to each room and between rooms.",
    adjacency: "The choice of which rooms share a wall or a door, and which stay apart.",
    privacy: "How well a space is sheltered from views, noise, and entry by people who should not be there.",
    daylight: "Light from the sun and sky. A window brings it in, and also heat, a view, and a loss of privacy.",
    accessibility: "Designing so more people can enter and use a place, including people who cannot climb steps.",
    foundation: "The part that passes the building's weight into the ground. Lintel does not model it.",
    structure: "The system, such as walls or a frame, that carries loads. The course introduces the idea and does not design it.",
    slab: "A floor or roof plate. In Lintel a slab is a flat plate on a storey, not a calculated structure.",
    "bearing-wall": "A wall that carries load from above, not only a divider. The software does not mark walls this way.",
    partition: "An interior wall whose main job is to divide rooms. It may or may not carry load in a real building.",
    envelope: "The outside skin, including roof, walls, and windows, that separates indoors from weather.",
    roof: "The top that sheds rain and snow and completes the shelter. This version of Lintel does not model roofs.",
    opening: "A gap in a wall for a door, a window, or a passage. It is not the same word as a structural span.",
    lintel: "A short beam that spans the top of an opening so the wall above can continue. The app does not draw it as a separate piece.",
    finishes: "The surfaces you see and touch, such as paint, plaster, and flooring. They are not the load path.",
    load: "A force the building must carry, including its own weight and the weight of people, furniture, snow, or wind.",
    "load-path": "The route a load follows from where it acts, through the structure and foundation, into the ground.",
    span: "The distance a floor, beam, or lintel crosses between supports. Longer spans are generally harder.",
    brief: "A statement of who the building is for, what they must be able to do, and which limits matter.",
    concept: "The organising idea that guides later drawings, such as where light and entry should be.",
    material: "What something is made of. A material name in Lintel is a label, not layers, tests, or a specification.",
    door: "An opening people pass through. In the sample it starts at the floor. That is an illustration, not a universal rule.",
    window: "An opening for light, view, and air. It often has a sill above the floor and also affects heat and privacy.",
  },
};
