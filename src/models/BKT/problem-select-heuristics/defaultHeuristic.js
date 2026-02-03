import {MASTERY_THRESHOLD} from "../../../config/config.js"

function heuristic(problems, completedProbs, lessonMastery) {
  var codeThreshold = 0.0
  var dragDropThreshold = 0.0
  var textBoxThreshold = 0.0
  var multipleChoiceThreshold = 0.0
  var chosenProblem = [];
  for (var problem of problems) {
    // Already completed this problem or irrelevant (null if not in learning goals)
    if (completedProbs.has(problem.id) || problem.probMastery == null || problem.probMastery >= MASTERY_THRESHOLD) {
      continue;
    } else if (lessonMastery < codeThreshold && problem.steps?.some(step => step.problemType == "Code")) { // if problem contains a "Code" step, then skip if its mastery is < threshold
      console.log("skipped Code problem with id:" + problem.id + " at current lesson mastery:" + lessonMastery);
      continue;
    } else if (lessonMastery < dragDropThreshold && problem.steps?.some(step => step.problemType == "DragDrop")) {
      console.log("skipped DragDrop problem with id:" + problem.id + " at current lesson mastery:" + lessonMastery);
      continue;
    } else if (lessonMastery < textBoxThreshold && problem.steps?.some(step => step.problemType == "TextBox")) {
      console.log("skipped TextBox problem with id:" + problem.id + " at current lesson mastery:" + lessonMastery);
      continue;
    } else if (lessonMastery < multipleChoiceThreshold && problem.steps?.some(step => step.problemType == "MultipleChoice")) {
      console.log("skipped MultipleChoice problem with id:" + problem.id + " at current lesson mastery:" + lessonMastery);
      continue;
    } else if (chosenProblem.length === 0 || chosenProblem[0].probMastery > problem.probMastery) {
      chosenProblem = [problem];
    } else if (chosenProblem.length > 0 && chosenProblem[0].probMastery === problem.probMastery) {
      chosenProblem.push(problem);
    }
  }
  // Choose random from problems with equal mastery
  return chosenProblem[Math.floor(Math.random() * chosenProblem.length)];
}

export { heuristic };
