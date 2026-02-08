# Python OATutor

This project enhances [OATutor](https://github.com/CAHLR/OATutor), an Open-source Adaptive Tutoring System (OAT) based on Intelligent Tutoring System principles, into a Python tutoring platform with new problem types, built-in Python editor and interpreter, revamped hint system, and a problem-adding platform for ease of use. Our main goal is to improve learning experience through more variety in problem types, and reducing teacher efforts in registering new problems to the platform.

Credits for the original OATutor:

Zachary A. Pardos, Matthew Tang, Ioannis Anastasopoulos, Shreya K. Sheel, and Ethan Zhang. 2023. OATutor: An Open-source Adaptive Tutoring System and Curated Content Library for Learning Sciences Research. In *Proceedings of the 2023 CHI Conference on Human Factors in Computing Systems (CHI '23)*. Association for Computing Machinery, New York, NY, USA, Article 416, 1–17. [https://doi.org/10.1145/3544548.3581574](https://doi.org/10.1145/3544548.3581574)
```
@inproceedings{pardos2023oat,
  title={OATutor: An Open-source Adaptive Tutoring System and Curated Content Library for Learning Sciences Research},
  author={Pardos, Z.A., Tang, M., Anastasopoulos, I., Sheel, S.K., Zhang, E},
  booktitle={Proceedings of the 2023 CHI Conference on Human Factors in Computing Systems},
  pages={1--17},
  organization={Association for Computing Machinery},
  doi={https://doi.org/10.1145/3544548.3581574},
  year={2023}
}
```

### Content
Content Repository: [Link](https://github.com/vincent-dennis/OATutor-Content)

This content repository contains basic Python problems curated by us as a way to showcase the enhanced platform's capabilities.

All content is available in JSON format within the repository.

## Requirements

The installation assumes that you already have Git, Node.js, and npm installed.

## Installation

```sh
git clone --recurse-submodules https://github.com/vincent-dennis/OATutor.git
cd OATutor
```

### Normal start

```sh
npm run dev
```

### Docker

```sh
docker compose up --build
```

## New Features:

1. Free coding problem type: Tasks where student have to type out Python code to produce the correct output, provided a Python interpreter with output terminal.
2. Drag-and-drop problem type: students are given a list of elements which they can dragand-drop to put in the correct ordering.
3. Enhanced hint system: A new hint appears only after the previous hint was opened and a wrong attempt was submitted, encouraging active problem-solving and prevents skipping directly to the final solution
4. Optional mastery threshold: provided options to set a minimum lesson mastery threshold for the different types of problem, adjustable by simply changing parameters in the problem selection heuristic at `src\models\BKT\problem-select-heuristics\defaultHeuristic.js`.
5. Teacher mode: Register courses, lessons, and problems via the frontend, so no manual file handling and creation is needed by educators. Newly added or modified content can be reloaded via a button in the frontend, no application restart required.

## Notable changes made to the original project:

Original directory structure and guides can be found in the original project [README](https://github.com/CAHLR/OATutor).

- `server\server.js`: a backend server that handles course, lesson, and problem creation

- `src\components\forms`: new frontend forms for registering new courses, lessons, and problems

- `src\components\problem-input\ProblemInput.js`: handling the input for the new problem types

- `src\components\problem-layout\HintSystem.js`: revamped hint system

- `src\components\problem-layout\LessonSelection.js`: reload problem pool button, teacher mode toggle

- `src\content-sources\oatutor`: new problem pool

- `src\models\BKT\problem-select-heuristics\defaultHeuristic.js`: mastery threshold options

- `src\pages\Posts\AddProblemGuide.js`: newly added guide on adding problems via frontend

- `src\platform-logic\checkAnswer.js`: updated logic for DragDrop problem type answer checking, fixed an existing bug with numeric answer type.

- `src\util\pyodideRunner.js`: class that sets up the Python interpreter for free coding problems.

## Content Sources

- OATutor can support multiple content sources simultaneously, compartmentalizing courses, lessons, and problems of
  different topics
- Currently, the updated `oatutor` content source for Python is included in this repository as a [git submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
  to enable separate versioning
- However, content sources can be copied in as entire folders as well and committed to this repository

### Types of problems (updated)

* `TextBox` : Box for student to enter answer. 3 different types of answers are supported: Algebraic, String, Numeric.
  Algebraic will simplify numeric expressions, numeric checks numeric equivalence, string requires answers to exactly
  match.
* `MultipleChoice`: List choices as `choices: ["Choice A", "Choice B"]`, must have `answerType: "string"`
* `Code`: Python coding environment for the student. Provide the expected terminal output and must have `answerType: "string"`.
* `DragDrop`: Students are given a list of elements they can reorder. Provide the expected correct ordering in a list, and must have `answerType: "DragDrop"`.
