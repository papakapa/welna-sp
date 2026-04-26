import type { Operation, Example, TrainingMode } from "../types/types";
import { clampLevel } from "./level";
import { createId, randomInt, randomItem } from "./random";

type GenerateExampleParams = {
  mode: TrainingMode;
  level: number;
};

export const generateExample = (params: GenerateExampleParams): Example => {
  const level = clampLevel(params.level);

  if (params.mode === "addition") {
    return generateAdditionExample(level, params.mode);
  }

  if (params.mode === "multiplication") {
    return generateMultiplicationExample(level, params.mode);
  }

  const operationGroup = randomItem<"addition" | "multiplication">([
    "addition",
    "multiplication",
  ]);

  return operationGroup === "addition"
    ? generateAdditionExample(level, params.mode)
    : generateMultiplicationExample(level, params.mode);
}

const generateAdditionExample = (level: number, mode: TrainingMode): Example => {
  const operation = randomItem<Operation>(["+", "-"]);

  if (operation === "+") {
    return createExample({
      ...generateAdditionNumbers(level),
      operation,
      level,
      mode,
    });
  }

  const subtractionNumbers = generateSubtractionNumbers(level);

  return createExample({
    ...subtractionNumbers,
    operation,
    level,
    mode,
  });
}

const generateMultiplicationExample = (level: number, mode: TrainingMode): Example => {
  const operation = randomItem<Operation>(["*", "/"]);

  if (operation === "*") {
    return createExample({
      ...generateMultiplicationNumbers(level),
      operation,
      level,
      mode,
    });
  }

  return createExample({
    ...generateDivisionNumbers(level),
    operation,
    level,
    mode,
  });
}

const generateAdditionNumbers = (level: number): { left: number; right: number } => {
  switch (level) {
    case 1:
      return {
        left: randomInt(1, 9),
        right: randomInt(1, 9),
      };

    case 2:
      return {
        left: randomInt(10, 99),
        right: randomInt(1, 9),
      };

    case 3:
      return {
        left: randomInt(10, 70),
        right: randomInt(10, 29),
      };

    case 4:
      return {
        left: randomInt(10, 99),
        right: randomInt(10, 99),
      };

    case 5:
      return {
        left: randomInt(100, 999),
        right: randomInt(10, 99),
      };

    case 6:
      return {
        left: randomInt(100, 999),
        right: randomInt(100, 999),
      };

    case 7:
    default:
      return randomItem([
        generateAdditionNumbers(4),
        generateAdditionNumbers(5),
        generateAdditionNumbers(6),
      ]);
  }
}

const generateSubtractionNumbers = (level: number): { left: number; right: number } =>   {
  let left: number;
  let right: number;

  switch (level) {
    case 1:
      left = randomInt(1, 9);
      right = randomInt(1, left);
      return { left, right };

    case 2:
      left = randomInt(10, 99);
      right = randomInt(1, 9);
      return { left, right };

    case 3:
      left = randomInt(30, 99);
      right = randomInt(10, Math.min(29, left));
      return { left, right };

    case 4:
      left = randomInt(20, 99);
      right = randomInt(10, left);
      return { left, right };

    case 5:
      left = randomInt(100, 999);
      right = randomInt(10, 99);
      return { left, right };

    case 6:
      left = randomInt(100, 999);
      right = randomInt(100, left);
      return { left, right };

    case 7:
    default:
      return randomItem([
        generateSubtractionNumbers(4),
        generateSubtractionNumbers(5),
        generateSubtractionNumbers(6),
      ]);
  }
}

const generateMultiplicationNumbers = (level: number): { left: number; right: number } => {
  switch (level) {
    case 1:
      return {
        left: randomInt(1, 5),
        right: randomInt(1, 5),
      };

    case 2:
      return {
        left: randomInt(1, 10),
        right: randomInt(1, 10),
      };

    case 3:
      return {
        left: randomInt(1, 12),
        right: randomInt(1, 12),
      };

    case 4:
      return {
        left: randomInt(10, 20),
        right: randomInt(2, 9),
      };

    case 5:
      return {
        left: randomInt(10, 99),
        right: randomInt(2, 5),
      };

    case 6:
      return {
        left: randomInt(10, 99),
        right: randomInt(6, 12),
      };

    case 7:
    default:
      return {
        left: randomInt(11, 19),
        right: randomInt(11, 19),
      };
  }
}

const generateDivisionNumbers = (level: number): { left: number; right: number } => {
  let answer: number;
  let right: number;

  switch (level) {
    case 1:
      answer = randomInt(1, 5);
      right = randomInt(1, 5);
      break;

    case 2:
      answer = randomInt(1, 10);
      right = randomInt(1, 10);
      break;

    case 3:
      answer = randomInt(1, 12);
      right = randomInt(1, 12);
      break;

    case 4:
      answer = randomInt(10, 20);
      right = randomInt(2, 9);
      break;

    case 5:
      answer = randomInt(10, 99);
      right = randomInt(2, 5);
      break;

    case 6:
      answer = randomInt(10, 99);
      right = randomInt(6, 12);
      break;

    case 7:
    default:
      answer = randomInt(11, 19);
      right = randomInt(11, 19);
      break;
  }

  return {
    left: answer * right,
    right,
  };
}

const createExample = (input: {
  left: number;
  right: number;
  operation: Operation;
  level: number;
  mode: TrainingMode;
}): Example => {
  return {
    id: createId("example"),
    left: input.left,
    right: input.right,
    operation: input.operation,
    answer: calculateAnswer(input.left, input.right, input.operation),
    level: input.level,
    mode: input.mode,
  };
};

const calculateAnswer = (left: number, right: number, operation: Operation): number => {
  switch (operation) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      return left / right;
  }
}