import { Repositories } from "../repositories";
import { Action, Automation, Task } from "../models";
import { ConjunctionHelper } from "./ConjunctionHelper";
import { Note } from "../apiBase/models";

export class AutomationHelper {

  public static async check(automation: Automation) {
    const triggeredPeopleIds = await ConjunctionHelper.getPeopleIds(automation);
    // if * load all peopele

    if (triggeredPeopleIds.length > 0) {
      const existingTasks: Task[] = await Repositories.getCurrent().task.loadByAutomationIdContent(automation.churchId, automation.id, "person", triggeredPeopleIds);
      for (const t of existingTasks) {
        const idx = triggeredPeopleIds.indexOf(t.associatedWithId);
        if (idx > -1) triggeredPeopleIds.splice(idx, 1);
      }
    }

    if (triggeredPeopleIds.length > 0) {
      const actions: Action[] = await Repositories.getCurrent().action.loadForAutomation(automation.churchId, automation.id);
      const people: any[] = await Repositories.getCurrent().membership.loadPeople(automation.churchId, triggeredPeopleIds);
      actions.forEach(action => {
        if (action.actionType === "task") this.createTasks(automation, people, JSON.parse(action.actionData))
      })

    }

  }

  public static async createTasks(automation: Automation, people: { id: string, displayName: string }[], details: any) {
    const result: Task[] = [];
    for (const p of people) {
      const task: Task = {
        churchId: automation.churchId,
        dateCreated: new Date(),
        associatedWithType: "person",
        associatedWithId: p.id,
        associatedWithLabel: p.displayName,
        createdByType: "system",
        createdByLabel: "System",
        assignedToType: details.assignedToType,
        assignedToId: details.assignedToId,
        assignedToLabel: details.assignedToLabel,
        status: "Open",
        automationId: automation.id,
        title: details.title
      };

      result.push(
        await Repositories.getCurrent().task.save(task).then(async (t: Task) => {
          const note: Note = { contentType: "task", contentId: t.id, addedBy: t.assignedToId, contents: details.note };
          await Repositories.getCurrent().note.save(note);
          return t;
        })
      );

    }
    return result;
  }


}