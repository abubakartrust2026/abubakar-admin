import mongoose from 'mongoose';

// Soft-delete plugin: adds isDeleted/deletedAt/deletedBy, hides deleted docs from every
// find/count/update/aggregate by default, and adds softDelete()/restore() helpers.
// Pass `{ withDeleted: true }` as a query option (or call .setOptions) to include them.
const softDeletePlugin = (schema) => {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  });

  const hideDeleted = function (next) {
    if (!this.getOptions().withDeleted) {
      this.where({ isDeleted: { $ne: true } });
    }
    next();
  };

  [
    'find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete',
    'countDocuments', 'count', 'updateOne', 'updateMany',
  ].forEach((op) => schema.pre(op, hideDeleted));

  schema.pre('aggregate', function (next) {
    if (!this.options?.withDeleted) {
      this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
    }
    next();
  });

  schema.methods.softDelete = function (userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    return this.save({ validateBeforeSave: false });
  };

  schema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    return this.save({ validateBeforeSave: false });
  };
};

export default softDeletePlugin;
