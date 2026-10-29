import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ROLL_REGEX = /^[0-9]{2}(ADR|CSR|ALR|ECR|EER|ITR)[0-9]{3}$/;

const DEPT_MAP = {
  ADR: 'Artificial Intelligence & Data Science',
  CSR: 'Computer Science & Engineering',
  ALR: 'Artificial Intelligence & Machine Learning',
  ECR: 'Electronics & Communication Engineering',
  EER: 'Electrical & Electronics Engineering',
  ITR: 'Information Technology'
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long']
    },
    email: {
      type: String,
      required: [true, 'College email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    studentId: {
      type: String,
      required: [true, 'Student roll number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [ROLL_REGEX, 'Roll number must match format YYCCCNNN (e.g. 23ADR157)']
    },
    department: {
      type: String,
      default: function () {
        if (this.studentId && this.studentId.length === 8) {
          const code = this.studentId.slice(2, 5);
          return DEPT_MAP[code] || 'Engineering';
        }
        return 'Engineering';
      }
    },
    role: {
      type: String,
      enum: ['Student', 'Faculty', 'Admin'],
      default: 'Student'
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Never include password by default in queries
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    throw new Error('Password hash not selected in query');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Ensure sensitive fields (password, __v) are NEVER exposed in JSON responses
userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    ret.id = ret._id;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);
export default User;
