from flask import send_file
import pandas as pd
from io import BytesIO
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import text
app = Flask(__name__)
CORS(app)  # 启用跨域资源共享

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///contacts.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


class PhoneNumber(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    contact_id = db.Column(db.Integer, db.ForeignKey('contact.id'), nullable=False)
    number = db.Column(db.String(20), nullable=False)

@app.route('/export_contacts', methods=['GET'])
def export_contacts():
    contacts = Contact.query.all()

    # 构建数据
    data = []
    for contact in contacts:
        phones = PhoneNumber.query.filter_by(contact_id=contact.id).all()
        phone_numbers = ', '.join([phone.number for phone in phones])  # 多个电话合并成字符串
        data.append({
            "姓名": contact.name,
            "学号": contact.student_id,
            "邮箱": contact.email,
            "地址": contact.address,
            "昵称": contact.nickname,
            "特别关心": contact.special_care,
            "黑名单": contact.blacklist,
            "电话号码": phone_numbers,
        })

    # 使用 pandas 创建 DataFrame
    df = pd.DataFrame(data)

    # 写入 Excel 文件
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='通讯录')

    output.seek(0)
    return send_file(output, as_attachment=True, download_name='contacts.xlsx', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@app.route('/import_contacts', methods=['POST'])
def import_contacts():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # 使用 pandas 读取 Excel 文件
    try:
        df = pd.read_excel(file)
    except Exception as e:
        return jsonify({"error": f"Failed to read Excel file: {str(e)}"}), 400

    # 处理每一行
    for _, row in df.iterrows():
        contact = Contact(
            name=row.get('姓名'),
            student_id=row.get('学号'),
            email=row.get('邮箱'),
            address=row.get('地址'),
            nickname=row.get('昵称'),
            special_care=bool(row.get('特别关心', False)),
            blacklist=bool(row.get('黑名单', False)),
        )
        db.session.add(contact)
        db.session.commit()

        # 添加电话号码
        if '电话号码' in row:
            phone_numbers = str(row['电话号码']).split(',')  # 用逗号分隔电话号码
            for phone in phone_numbers:
                phone_record = PhoneNumber(contact_id=contact.id, number=phone.strip())
                db.session.add(phone_record)

    db.session.commit()
    return jsonify({"message": "Contacts imported successfully!"}), 200

@app.route('/update_phone/<int:contact_id>', methods=['PUT'])
def update_phone(contact_id):
    data = request.json
    old_phone = data.get('old_phone')
    new_phone = data.get('new_phone')

    if not old_phone or not new_phone:
        return jsonify({"error": "Old and new phone numbers are required"}), 400

    phone_record = PhoneNumber.query.filter_by(contact_id=contact_id, number=old_phone).first()
    if not phone_record:
        return jsonify({"error": "Phone number not found"}), 404

    phone_record.number = new_phone
    db.session.commit()
    return jsonify({"message": "Phone number updated successfully!"}), 200

@app.route('/add_phone/<int:contact_id>', methods=['POST'])
def add_phone(contact_id):
    data = request.json
    phone = data.get('phone')
    if not phone:
        return jsonify({"error": "Phone number is required"}), 400

    new_phone = PhoneNumber(contact_id=contact_id, number=phone)
    db.session.add(new_phone)
    db.session.commit()
    return jsonify({"message": "Phone number added successfully!"}), 201


@app.route('/get_phones/<int:contact_id>', methods=['GET'])
def get_phones(contact_id):
    phones = PhoneNumber.query.filter_by(contact_id=contact_id).all()
    return jsonify([phone.number for phone in phones])


class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    student_id = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(100), nullable=True)
    address = db.Column(db.String(200), nullable=True)
    nickname = db.Column(db.String(50), nullable=True)
    special_care = db.Column(db.Boolean, default=False)
    blacklist = db.Column(db.Boolean, default=False)
    bookmark = db.Column(db.String(20), nullable=True)  # 添加字段

# 获取联系人列表（不包含黑名单中的联系人）
def setup_database():
    """
    检查并修复数据库结构
    """
    with app.app_context():
        try:
            # 检查 'bookmark' 列是否存在
            db.session.execute(text('SELECT bookmark FROM contact LIMIT 1'))
        except Exception as e:
            print("Adding 'bookmark' column to 'contact' table...")
            with db.engine.connect() as conn:
                # 动态添加列，使用 text 包装原生 SQL
                conn.execute(text('ALTER TABLE contact ADD COLUMN bookmark VARCHAR(20)'))
        db.create_all()
def format_contact(contact):
    phones = PhoneNumber.query.filter_by(contact_id=contact.id).all()
    phone_numbers = [phone.number for phone in phones]
    return {
        'id': contact.id,
        'name': contact.name,
        'phones': phone_numbers,
        'student_id': contact.student_id,
        'email': contact.email,
        'address': contact.address,
        'nickname': contact.nickname,
        'special_care': contact.special_care,
        'blacklist': contact.blacklist,
        'bookmark': contact.bookmark
    }
@app.route('/toggle_bookmark/<int:id>', methods=['POST'])
def toggle_bookmark(id):
    data = request.json
    contact = Contact.query.get_or_404(id)
    bookmark = data.get('bookmark')

    if bookmark in ['family', 'friends', 'special']:
        contact.bookmark = bookmark if contact.bookmark != bookmark else None
        db.session.commit()
        return jsonify({"message": f"Bookmark updated to {contact.bookmark}"}), 200
    return jsonify({"error": "Invalid bookmark type"}), 400

@app.route('/contacts_by_bookmark/<string:bookmark>', methods=['GET'])
def contacts_by_bookmark(bookmark):
    contacts = Contact.query.filter_by(bookmark=bookmark).all()
    return jsonify([format_contact(contact) for contact in contacts])

@app.route('/contacts', methods=['GET'])
def get_contacts():
    contacts = Contact.query.filter_by(blacklist=False).all()
    contacts_sorted = sorted(contacts, key=lambda x: x.special_care, reverse=True)
    contacts_list = [format_contact(contact) for contact in contacts_sorted]
    return jsonify(contacts_list)

# 根路径路由，返回所有联系人（特别关心的联系人置顶，黑名单的联系人被过滤）
@app.route('/', methods=['GET'])
def index():
    contacts = Contact.query.filter_by(blacklist=False).all()
    contacts_sorted = sorted(contacts, key=lambda x: x.special_care, reverse=True)
    contacts_list = [format_contact(contact) for contact in contacts_sorted]
    return jsonify(contacts_list)

# 添加联系人
@app.route('/add_contact', methods=['POST'])
def add_contact():
    data = request.json
    phone = data.get('phone')

    if not phone:
        return jsonify({"error": "Phone number is required"}), 400
    new_contact = Contact(
        name=data['name'],
        phone=phone,
        student_id=data['student_id'],
        email=data.get('email'),
        address=data.get('address'),
        nickname=data.get('nickname')
    )
    db.session.add(new_contact)
    db.session.commit()
    # 添加电话号码到 PhoneNumber 表
    new_phone = PhoneNumber(contact_id=new_contact.id, number=phone)
    db.session.add(new_phone)
    db.session.commit()
    return jsonify({"message": "Contact added successfully!"}), 201

# 删除联系人
@app.route('/delete_contact/<int:id>', methods=['DELETE'])
def delete_contact(id):
    contact = Contact.query.get_or_404(id)
    PhoneNumber.query.filter_by(contact_id=contact.id).delete()
    db.session.delete(contact)
    db.session.commit()
    return jsonify({"message": "Contact deleted successfully!"}), 200

# 切换特别关心状态
@app.route('/toggle_special_care/<int:id>', methods=['POST'])
def toggle_special_care(id):
    contact = Contact.query.get_or_404(id)
    contact.special_care = not contact.special_care
    db.session.commit()
    return jsonify({"message": f"Contact special care status toggled to {contact.special_care}"}), 200

# 获取黑名单中的联系人列表
@app.route('/blacklist_contacts', methods=['GET'])
def blacklist_contacts():
    contacts = Contact.query.filter_by(blacklist=True).all()
    blacklist_list = [format_contact(contact) for contact in contacts]
    return jsonify(blacklist_list)

# 切换黑名单状态
@app.route('/toggle_blacklist/<int:id>', methods=['POST'])
def toggle_blacklist(id):
    contact = Contact.query.get_or_404(id)
    contact.blacklist = not contact.blacklist
    db.session.commit()
    return jsonify({"message": f"Contact blacklist status toggled to {contact.blacklist}"}), 200

# 更新联系人信息的路由
@app.route('/update_contact/<int:id>', methods=['PUT'])
def update_contact(id):
    data = request.json
    contact = Contact.query.get_or_404(id)

    contact.name = data.get('name', contact.name)
    contact.phone = data.get('phone', contact.phone)
    contact.student_id = data.get('student_id', contact.student_id)
    contact.email = data.get('email', contact.email)
    contact.address = data.get('address', contact.address)
    contact.nickname = data.get('nickname', contact.nickname)
    db.session.commit()
    if 'phone' in data:
        main_phone = PhoneNumber.query.filter_by(contact_id=contact.id, number=contact.phone).first()
        if main_phone:
            main_phone.number = data['phone']
            db.session.commit()
    return jsonify({"message": "Contact updated successfully!"}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # 在应用上下文中创建所有表
    app.run(host='0.0.0.0', port=5000, debug=True)



