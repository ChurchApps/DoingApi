import { controller, httpPost, httpGet, interfaces, requestParam, httpDelete } from "inversify-express-utils";
import express from "express";
import { DoingBaseController } from "./DoingBaseController"
import { Plan, Position, Time } from "../models"
import { PlanHelper } from "../helpers/PlanHelper";

@controller("/plans")
export class PlanController extends DoingBaseController {

  @httpGet("/ids")
  public async getByIds(req: express.Request<{}, {}, null>, res: express.Response): Promise<interfaces.IHttpActionResult> {
    return this.actionWrapper(req, res, async (au) => {
      const idsString = req.query.ids as string;
      const ids = idsString.split(",");
      return await this.repositories.plan.loadByIds(au.churchId, ids);
    });
  }

  @httpGet("/:id")
  public async get(@requestParam("id") id: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<interfaces.IHttpActionResult> {
    return this.actionWrapper(req, res, async (au) => {
      return await this.repositories.plan.load(au.churchId, id);
    });
  }

  @httpGet("/")
  public async getForAll(req: express.Request<{}, {}, null>, res: express.Response): Promise<interfaces.IHttpActionResult> {
    return this.actionWrapper(req, res, async (au) => {
      return await this.repositories.plan.loadAll(au.churchId);
    });
  }

  private adjustTime(time:Date, serviceDate:Date, oldServiceDate:Date) {
    const dayDiff = serviceDate.getDate() - oldServiceDate.getDate();
    const result = new Date(time);
    result.setDate(result.getDate() + dayDiff);
    return result;
  }

  @httpPost("/autofill/:id")
  public async autofill(@requestParam("id") id: string, req: express.Request<{}, {}, {teams:{positionId:string, personIds:string[]}[]}>, res: express.Response): Promise<interfaces.IHttpActionResult> {
    return this.actionWrapper(req, res, async (au) => {

      const plan = await this.repositories.plan.load(au.churchId, id);
      const positions:Position[] = await this.repositories.position.loadByPlanId(au.churchId, id);
      const assignments = await this.repositories.assignment.loadByPlanId(au.churchId, id);
      const blockoutDates = await this.repositories.blockoutDate.loadUpcoming(au.churchId);
      const lastServed = await this.repositories.assignment.loadLastServed(au.churchId);

      PlanHelper.autofill(positions, assignments, blockoutDates, req.body.teams, lastServed);


      return plan;
    });
  }

  @httpPost("/copy/:id")
  public async copy(@requestParam("id") id: string, req: express.Request<{}, {}, Plan>, res: express.Response): Promise<interfaces.IHttpActionResult> {
    return this.actionWrapper(req, res, async (au) => {

      const oldPlan = await this.repositories.plan.load(au.churchId, id);
      const times:Time[] = await this.repositories.time.loadByPlanId(au.churchId, id);
      const positions:Position[] = await this.repositories.position.loadByPlanId(au.churchId, id);

      const p = { ...req.body } as Plan;
      p.churchId = au.churchId;
      p.serviceDate = new Date(req.body.serviceDate);
      const plan = await this.repositories.plan.save(p);

      const promises: Promise<any>[] = [];
      times.forEach(time => {
        time.id = null;
        time.planId = plan.id;
        time.startTime = this.adjustTime(time.startTime, plan.serviceDate, oldPlan.serviceDate);
        time.endTime = this.adjustTime(time.endTime, plan.serviceDate, oldPlan.serviceDate);
        promises.push(this.repositories.time.save(time));
      });
      positions.forEach(position => {
        position.id = null;
        position.planId = plan.id;
        promises.push(this.repositories.position.save(position));
      });

      await Promise.all(promises);
      return plan;
    });
  }

  @httpPost("/")
  public async save(req: express.Request<{}, {}, Plan[]>, res: express.Response): Promise<interfaces.IHttpActionResult> {
    return this.actionWrapper(req, res, async (au) => {
      const promises: Promise<Plan>[] = [];
      req.body.forEach(plan => {
        plan.churchId = au.churchId;
        promises.push(this.repositories.plan.save(plan));
      });
      const result = await Promise.all(promises);
      return result;
    });
  }

  @httpDelete("/:id")
  public async delete(@requestParam("id") id: string, req: express.Request<{}, {}, null>, res: express.Response): Promise<interfaces.IHttpActionResult> {
    return this.actionWrapper(req, res, async (au) => {
      await this.repositories.time.deleteByPlanId(au.churchId, id);
      await this.repositories.assignment.deleteByPlanId(au.churchId, id);
      await this.repositories.position.deleteByPlanId(au.churchId, id);
      await this.repositories.plan.delete(au.churchId, id);
      return this.json({});
    });
  }

}
