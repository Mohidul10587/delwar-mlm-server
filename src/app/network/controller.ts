import { Request, Response, NextFunction } from "express";
import { User } from "../user/model";

interface TreeNode {
  _id: string;
  username: string;
  name: string;
  children: TreeNode[];
}

const buildTreeFromFlat = (nodes: any[], parentId: string): TreeNode[] =>
  nodes
    .filter(n => n.placementAncestors?.[0]?.userId?.toString() === parentId)
    .map(n => ({
      _id: n._id.toString(),
      username: n.username,
      name: n.name,
      children: buildTreeFromFlat(nodes, n._id.toString()),
    }));

export const getDownline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const all = await User.find({ "placementAncestors.userId": req.user!._id })
      .select("_id username name placementAncestors")
      .lean();
    res.json({ tree: buildTreeFromFlat(all, req.user!._id.toString()) });
  } catch (err) { next(err); }
};

export const getUpline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = await User.findById(req.user!._id).select("placementAncestors").lean();
    const level1 = (me as any)?.placementAncestors?.[0];
    if (!level1) return res.json({ upline: null });
    const parent = await User.findById(level1.userId).select("_id username name").lean();
    if (!parent) return res.json({ upline: null });
    res.json({ upline: { _id: parent._id.toString(), username: parent.username, name: parent.name } });
  } catch (err) { next(err); }
};

export const getReferrals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const referrals = await User.find({ "generationAncestors.0.userId": req.user!._id }).select("_id username name phone createdAt").lean();
    res.json({ referrals });
  } catch (err) { next(err); }
};
