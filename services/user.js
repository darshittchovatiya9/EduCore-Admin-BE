const BaseService = require(".");
const {createHash} = require("../common/hash");
const UserModel = require('../models/User')
const User = require("../models/User");
const CompanyModel = require("../models/company")

class UserService extends BaseService{
    async createUser() {

        const isEmailExist = await this.isUserEmailExist(this.reqBody.email)
        const isContactExist = await this.isUserContactExist(this.reqBody.contact)

        if(isEmailExist){
            throw new Error("User with this email already exists");
        }

        if(isContactExist){
            throw new Error("User with this contact already exists");
        }
        
        const company = new CompanyModel({company_name: this.reqBody.company_name})

        const companyData  = await company.save()

        const encryptedPassword = await createHash(this.reqBody.password);

        const dbUser =  new UserModel({...this.reqBody, password: encryptedPassword, company_id: companyData._id})
        const user = await dbUser.save();

        return user.id;
    }

    async getAllUsers(){

        const users = await UserModel.find({deleted_at: null});

        return users.map((e)=> this._getUserData(e))
    }

    async getRoleWiseUsers(companyId, role) {
        try {
            const users = await UserModel.find({ company_id: companyId, role: role, deleted_at: null });
            return users.map(user => {
                return {
                    _id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                };
            });
        } catch (error) {
            throw new Error(`Error fetching ${role} users for company ${companyId}: ${error.message}`);
        }
    }

    async getUser(userId){
        const actualUserId = userId === "me" ? this.reqUser._id : userId;

        const user = await User.findOne({ _id: actualUserId, deleted_at: null })

        return user
    }
    async updateUser(userId){
        const user = await User.findOne({ _id: userId, deleted_at: null })

        if(!user){
            throw new Error("User not found")
        }

        const updatedUser = await User.findByIdAndUpdate(userId, this.reqBody, { new: true })

        return this._getUserData(updatedUser)
    }

    async isUserEmailExist(email){
        return User.findOne({email})
    }

    async isUserContactExist(contact){
        return User.findOne({contact})
    }

    _getUserData(user){
        return {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            contact: user.contact,
            role: user.role,
            other_info: user.other_info,
            avatar_url : user.avatar_url,
            company_id: user.company_id
        }
    }

}

module.exports = UserService;