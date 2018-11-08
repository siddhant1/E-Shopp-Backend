const mutations = {
  createItem(parent, { data }, { db }, info) {
    //TODO : Check if they are logged in
    return db.mutation.createItem(
      {
        data
      },
      info
    );
  },
  updateItem(parent, { data, where }, { db }, info) {
    const updates = data;
    delete updates.id;
    return db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: where.id
        }
      },
      info
    );
  },
  deleteItem(parent, { where }, { db }, info) {
    return db.mutation.deleteItem(
      {
        where
      },
      info
    );
  }
};

module.exports = mutations;
