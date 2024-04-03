import { injectable } from "inversify";
import { UniqueIdHelper } from "@churchapps/apihelper"
import { DB } from "@churchapps/apihelper"
import { Plan } from "../models";

@injectable()
export class PlanRepository {

  public save(plan: Plan) {
    return plan.id ? this.update(plan) : this.create(plan);
  }

  private async create(plan: Plan) {
    plan.id = UniqueIdHelper.shortId();

    const sql = "INSERT INTO plans (id, churchId, name, serviceDate, notes) VALUES (?, ?, ?, ?, ?);";
    const params = [plan.id, plan.churchId, plan.name, plan.serviceDate, plan.notes];
    await DB.query(sql, params);
    return plan;
  }

  private async update(plan: Plan) {
    const sql = "UPDATE plans SET name=?, serviceDate=?, notes=? WHERE id=? and churchId=?";
    const params = [plan.name, plan.serviceDate, plan.notes, plan.id, plan.churchId];
    await DB.query(sql, params);
    return plan;
  }

  public delete(churchId: string, id: string) {
    return DB.query("DELETE FROM plans WHERE id=? AND churchId=?;", [id, churchId]);
  }

  public load(churchId: string, id: string) {
    return DB.queryOne("SELECT * FROM plans WHERE id=? AND churchId=?;", [id, churchId]);
  }

  public loadByIds(churchId: string, ids: string[]) {
    return DB.query("SELECT * FROM plans WHERE churchId=? and id in (?);", [churchId, ids]);
  }

  public loadAll(churchId: string) {
    return DB.query("SELECT * FROM plans WHERE churchId=? order by serviceDate desc;", [churchId]);
  }

}
