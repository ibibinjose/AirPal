import type { Pulse, PulseLogicRule, PulseQuestion, PulseTemplate } from "./pulse";
import { PULSE_ISSUE_CATEGORIES } from "./pulse";

/** Survey starter templates, split from pulse.ts (pulse/* core stays there). */
const EMOJI_OPTIONS = ["😠", "😕", "😐", "🙂", "😍"];

/** Stay “during stay” starter template (editable after create). */
export function stayDuringStayTemplate(
  propertyId: string,
  createdBy = "system",
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  const qStay: PulseQuestion = {
    id: "q_stay",
    type: "rating_5",
    prompt: "How is your stay?",
    required: true,
    options: EMOJI_OPTIONS,
    sortOrder: 1,
  };
  const qWrong: PulseQuestion = {
    id: "q_wrong",
    type: "single_choice",
    prompt: "What went wrong?",
    required: true,
    gated: true,
    options: [...PULSE_ISSUE_CATEGORIES],
    sortOrder: 2,
  };
  const qHelp: PulseQuestion = {
    id: "q_help",
    type: "text_short",
    prompt: "What can we do to help?",
    required: false,
    gated: true,
    sortOrder: 3,
  };
  const qContact: PulseQuestion = {
    id: "q_contact",
    type: "yes_no",
    prompt: "Want someone to contact you?",
    required: false,
    gated: true,
    sortOrder: 4,
  };

  const logic: PulseLogicRule[] = [
    {
      id: "r_show_wrong",
      sourceQuestionId: qStay.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qWrong.id,
    },
    {
      id: "r_show_help",
      sourceQuestionId: qStay.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qHelp.id,
    },
    {
      id: "r_show_contact",
      sourceQuestionId: qStay.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qContact.id,
    },
    {
      id: "r_create_issue",
      sourceQuestionId: qStay.id,
      operator: "lte",
      value: 2,
      action: "create_issue",
    },
    {
      id: "r_ask_contact",
      sourceQuestionId: qContact.id,
      operator: "eq",
      value: true,
      action: "ask_contact",
    },
  ];

  return {
    propertyId,
    name: "During stay",
    template: "stay_during",
    status: "draft",
    questions: [qStay, qWrong, qHelp, qContact],
    logic,
    branding: { title: "How is your stay?" },
    createdBy,
  };
}

/** Dining & Cafe template (food, ambiance, service, staff) */
export function diningCafeTemplate(
  propertyId: string,
  createdBy = "system",
  name = "Dining experience",
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  const qRate: PulseQuestion = {
    id: "q_dining",
    type: "rating_5",
    prompt: "How was your food & dining experience?",
    required: true,
    options: EMOJI_OPTIONS,
    sortOrder: 1,
  };
  const qWrong: PulseQuestion = {
    id: "q_wrong",
    type: "single_choice",
    prompt: "What went wrong?",
    required: true,
    gated: true,
    options: ["dining", "service", "cleanliness", "staff", "noise", "other"],
    sortOrder: 2,
  };
  const qHelp: PulseQuestion = {
    id: "q_help",
    type: "text_short",
    prompt: "How can our chef or manager make it right?",
    required: false,
    gated: true,
    sortOrder: 3,
  };
  const qContact: PulseQuestion = {
    id: "q_contact",
    type: "yes_no",
    prompt: "Would you like our team to follow up with you?",
    required: false,
    gated: true,
    sortOrder: 4,
  };

  const logic: PulseLogicRule[] = [
    {
      id: "r_show_wrong",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qWrong.id,
    },
    {
      id: "r_show_help",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qHelp.id,
    },
    {
      id: "r_show_contact",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qContact.id,
    },
    { id: "r_create_issue", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "create_issue" },
    { id: "r_ask_contact", sourceQuestionId: qContact.id, operator: "eq", value: true, action: "ask_contact" },
  ];

  return {
    propertyId,
    name,
    template: "dining_cafe",
    status: "draft",
    questions: [qRate, qWrong, qHelp, qContact],
    logic,
    branding: { title: "How was your experience?" },
    createdBy,
  };
}

/** Events & Experiences template (vibe, speaker, venue, organization) */
export function eventExperienceTemplate(
  propertyId: string,
  createdBy = "system",
  name = "Event feedback",
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  const qRate: PulseQuestion = {
    id: "q_event",
    type: "rating_5",
    prompt: "How was your experience at the event?",
    required: true,
    options: EMOJI_OPTIONS,
    sortOrder: 1,
  };
  const qWrong: PulseQuestion = {
    id: "q_wrong",
    type: "single_choice",
    prompt: "What could be improved?",
    required: true,
    gated: true,
    options: ["service", "staff", "noise", "cleanliness", "other"],
    sortOrder: 2,
  };
  const qHelp: PulseQuestion = {
    id: "q_help",
    type: "text_short",
    prompt: "Any suggestions for our organizers?",
    required: false,
    gated: true,
    sortOrder: 3,
  };
  const qContact: PulseQuestion = {
    id: "q_contact",
    type: "yes_no",
    prompt: "Want us to contact you for the next event?",
    required: false,
    gated: true,
    sortOrder: 4,
  };

  const logic: PulseLogicRule[] = [
    {
      id: "r_show_wrong",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qWrong.id,
    },
    {
      id: "r_show_help",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qHelp.id,
    },
    {
      id: "r_show_contact",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qContact.id,
    },
    { id: "r_create_issue", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "create_issue" },
    { id: "r_ask_contact", sourceQuestionId: qContact.id, operator: "eq", value: true, action: "ask_contact" },
  ];

  return {
    propertyId,
    name,
    template: "event_experience",
    status: "draft",
    questions: [qRate, qWrong, qHelp, qContact],
    logic,
    branding: { title: "How was the event?" },
    createdBy,
  };
}

/** Services & Retail template (speed, service, quality, pricing) */
export function serviceRetailTemplate(
  propertyId: string,
  createdBy = "system",
  name = "Service feedback",
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  const qRate: PulseQuestion = {
    id: "q_service",
    type: "rating_5",
    prompt: "How was your service today?",
    required: true,
    options: EMOJI_OPTIONS,
    sortOrder: 1,
  };
  const qWrong: PulseQuestion = {
    id: "q_wrong",
    type: "single_choice",
    prompt: "What went wrong?",
    required: true,
    gated: true,
    options: ["service", "staff", "cleanliness", "maintenance", "other"],
    sortOrder: 2,
  };
  const qHelp: PulseQuestion = {
    id: "q_help",
    type: "text_short",
    prompt: "What can we do to make it right?",
    required: false,
    gated: true,
    sortOrder: 3,
  };
  const qContact: PulseQuestion = {
    id: "q_contact",
    type: "yes_no",
    prompt: "Would you like our management to contact you?",
    required: false,
    gated: true,
    sortOrder: 4,
  };

  const logic: PulseLogicRule[] = [
    {
      id: "r_show_wrong",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qWrong.id,
    },
    {
      id: "r_show_help",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qHelp.id,
    },
    {
      id: "r_show_contact",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qContact.id,
    },
    { id: "r_create_issue", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "create_issue" },
    { id: "r_ask_contact", sourceQuestionId: qContact.id, operator: "eq", value: true, action: "ask_contact" },
  ];

  return {
    propertyId,
    name,
    template: "service_retail",
    status: "draft",
    questions: [qRate, qWrong, qHelp, qContact],
    logic,
    branding: { title: "How was your service?" },
    createdBy,
  };
}

/** General CSAT template for any individual, business, or creator */
export function generalCsatTemplate(
  propertyId: string,
  createdBy = "system",
  name = "Customer feedback",
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  const qRate: PulseQuestion = {
    id: "q_general",
    type: "rating_5",
    prompt: "How was your experience with us?",
    required: true,
    options: EMOJI_OPTIONS,
    sortOrder: 1,
  };
  const qWrong: PulseQuestion = {
    id: "q_wrong",
    type: "single_choice",
    prompt: "What went wrong?",
    required: true,
    gated: true,
    options: ["service", "staff", "cleanliness", "maintenance", "other"],
    sortOrder: 2,
  };
  const qHelp: PulseQuestion = {
    id: "q_help",
    type: "text_short",
    prompt: "How can we help or improve?",
    required: false,
    gated: true,
    sortOrder: 3,
  };
  const qContact: PulseQuestion = {
    id: "q_contact",
    type: "yes_no",
    prompt: "Want someone to follow up with you?",
    required: false,
    gated: true,
    sortOrder: 4,
  };

  const logic: PulseLogicRule[] = [
    {
      id: "r_show_wrong",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qWrong.id,
    },
    {
      id: "r_show_help",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qHelp.id,
    },
    {
      id: "r_show_contact",
      sourceQuestionId: qRate.id,
      operator: "lte",
      value: 2,
      action: "show_question",
      targetQuestionId: qContact.id,
    },
    { id: "r_create_issue", sourceQuestionId: qRate.id, operator: "lte", value: 2, action: "create_issue" },
    { id: "r_ask_contact", sourceQuestionId: qContact.id, operator: "eq", value: true, action: "ask_contact" },
  ];

  return {
    propertyId,
    name,
    template: "general_csat",
    status: "draft",
    questions: [qRate, qWrong, qHelp, qContact],
    logic,
    branding: { title: "How was your experience?" },
    createdBy,
  };
}

export function createPulseTemplate(
  template: PulseTemplate,
  propertyId: string,
  createdBy = "system",
  name?: string,
): Omit<Pulse, "id" | "createdAt" | "updatedAt"> {
  switch (template) {
    case "dining_cafe":
      return diningCafeTemplate(propertyId, createdBy, name || "Dining feedback");
    case "event_experience":
      return eventExperienceTemplate(propertyId, createdBy, name || "Event feedback");
    case "service_retail":
      return serviceRetailTemplate(propertyId, createdBy, name || "Service feedback");
    case "general_csat":
      return generalCsatTemplate(propertyId, createdBy, name || "Customer feedback");
    case "stay_during":
    default:
      return stayDuringStayTemplate(propertyId, createdBy);
  }
}
