// 定义后端的基础 URL
const BASE_URL = 'http://127.0.0.1:5000';
document.addEventListener('DOMContentLoaded', function () {
    if (window.location.pathname.includes('blacklist.html')) {
        loadBlacklist();
    } else {
        loadContacts();
    }

    const addContactForm = document.getElementById('add-contact-form');
    if (addContactForm) {
        addContactForm.addEventListener('submit', function (event) {
            event.preventDefault();
            addContact();
        });
    }

    // 确保“全部联系人”按钮始终显示
    const allContactsBtn = document.getElementById('all-contacts-btn');
    if (allContactsBtn) {
        allContactsBtn.style.display = 'inline-block';
    }
        // 确保“导出通讯录”按钮挂载事件
    const exportBtn = document.getElementById('export-contacts-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function () {
            fetch(`${BASE_URL}/export_contacts`)
                .then(response => {
                    if (!response.ok) throw new Error('Failed to export contacts');
                    return response.blob();
                })
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'contacts.xlsx';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                })
                .catch(error => console.error('Error exporting contacts:', error));
        });
    }
    // 确保“导入通讯录”按钮挂载事件
    const importBtn = document.getElementById('import-contacts-btn').addEventListener('click', function () {
        const fileInput = document.getElementById('import-file');
        if (!fileInput.files.length) {
            alert("请选择一个文件！");
            return;
        }
    
        const file = fileInput.files[0];
        if (!file.name.endsWith('.xlsx')) {
            alert("请上传一个 Excel 文件！");
            return;
        }
    
        const formData = new FormData();
        formData.append('file', file);
    
        fetch(`${BASE_URL}/import_contacts`, {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || "导入失败，请检查文件格式");
                });
            }
            return response.json();
        })
        .then(data => {
            alert("通讯录导入成功！");
            loadContacts(); // 重新加载联系人列表
        })
        .catch(error => {
            alert(error.message);
            console.error('Error importing contacts:', error);
        });
    });
    
});


function addPhone(contactId) {
    const newPhone = prompt("请输入新的手机号：");
    if (!newPhone) {
        alert("手机号不能为空！");
        return;
    }

    fetch(`${BASE_URL}/add_phone/${contactId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: newPhone }),
    })
    .then(response => {
        if (response.ok) {
            alert("手机号添加成功！");
            loadContacts(); // 刷新联系人列表，显示最新数据
        } else {
            console.error('Failed to add phone number');
        }
    })
    .catch(error => console.error('Error adding phone number:', error));
}

function editContact(contactId) {
    const editType = prompt(
        "请选择需要修改的内容:\n" +
        "1: 修改联系人基本信息 (姓名/学号等)\n" +
        "2: 修改电话号码"
    );

    if (!editType || (editType !== '1' && editType !== '2')) {
        alert("无效的选择。");
        return;
    }

    if (editType === '1') {
        // 修改联系人基本信息
        editContactInfo(contactId);
    } else if (editType === '2') {
        // 修改电话号码
        editPhone(contactId);
    }
}
// 编辑联系人表单的显示与提交
function editContactInfo(contactId) {
    let keepEditing = true; // 控制是否继续编辑

    const updateFields = {}; // 用来存储用户要更新的字段和值

    while (keepEditing) {
        // 让用户选择要更新的字段
        const field = prompt("请选择需要更新的信息: 1) 姓名 2) 学号 3) 邮箱 4) 地址 5) 昵称 (如果想退出请点击取消)");

        if (!field) return; // 如果用户取消或未输入，直接返回

        let newValue;
        switch (field) {
            case '1':
                newValue = prompt("输入新的姓名:");
                if (newValue) {
                    updateFields.name = newValue;
                }
                break;
            case '2':
                newValue = prompt("输入新的学号:");
                if (newValue) {
                    updateFields.student_id = newValue;
                }
                break;
            case '3':
                newValue = prompt("输入新的邮箱:");
                if (newValue) {
                    updateFields.email = newValue;
                }
                break;
            case '4':
                newValue = prompt("输入新的地址:");
                if (newValue) {
                    updateFields.address = newValue;
                }
                break;
            case '5':
                newValue = prompt("输入新的昵称:");
                if (newValue) {
                    updateFields.nickname = newValue;
                }
                break;
            default:
                alert("无效的选择，请输入 1-5 的选项。");
                continue; // 跳过当前循环
        }

        // 询问用户是否继续更改其他信息
        keepEditing = confirm("是否继续更改其他信息？");
    }

    // 如果有更新的字段，则发送请求
    if (Object.keys(updateFields).length > 0) {
        updateContactField(contactId, updateFields);
    }
}

function editPhone(contactId) {
    // 获取电话号码列表
    fetch(`${BASE_URL}/get_phones/${contactId}`)
        .then(response => response.json())
        .then(phones => {
            if (phones.length === 0) {
                alert("此联系人没有电话号码可编辑。");
                return;
            }

            // 显示电话号码供用户选择
            const phoneIndex = prompt(
                `请选择要修改的电话号码:\n` +
                phones.map((phone, index) => `${index + 1}: ${phone}`).join('\n') +
                `\n输入数字选择电话号码:`
            );

            if (!phoneIndex || isNaN(phoneIndex) || phoneIndex < 1 || phoneIndex > phones.length) {
                alert("无效的选择。");
                return;
            }

            // 提示输入新号码
            const newPhone = prompt("请输入新的电话号码:");
            if (!newPhone) {
                alert("电话号码不能为空！");
                return;
            }

            // 更新电话号码
            updatePhone(contactId, phones[phoneIndex - 1], newPhone);
        })
        .catch(error => console.error('Error fetching phone numbers:', error));
}

function updatePhone(contactId, oldPhone, newPhone) {
    fetch(`${BASE_URL}/update_phone/${contactId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ old_phone: oldPhone, new_phone: newPhone }),
    })
    .then(response => {
        if (response.ok) {
            alert("电话号码修改成功！");
            loadContacts(); // 刷新联系人列表
        } else {
            alert("电话号码修改失败！");
            console.error('Failed to update phone number');
        }
    })
    .catch(error => console.error('Error updating phone number:', error));
}

// 更新联系人特定字段的函数
function updateContactField(id, updatedData) {
    fetch(`${BASE_URL}/update_contact/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
    })
    .then(response => {
        if (response.ok) {
            loadContacts(); // 成功后重新获取联系人列表
        } else {
            console.error('Failed to update contact');
        }
    })
    .catch(error => console.error('Error updating contact:', error));
}


// 加载黑名单联系人
function loadBlacklist() {
    fetch(`${BASE_URL}/blacklist_contacts`)
        .then(response => response.json())
        .then(data => {
            const blacklistList = document.getElementById('blacklist-list');
            blacklistList.innerHTML = ''; // 清空列表，避免重复渲染
            data.forEach(contact => {
                const row = document.createElement('tr');
                row.className = 'contact';
                row.id = `contact-${contact.id}`;
                const phoneDisplay = Array.isArray(contact.phone) ? contact.phone.join(', ') : contact.phones || '无';

                row.innerHTML = `
                    <td>${contact.name}</td>
                    <td>${phoneDisplay}</td>
                    <td>${contact.student_id}</td>
                    <td>${contact.email }</td> <!-- 显示邮箱 -->
                    <td>${contact.address }</td> <!-- 显示地址 -->
                    <td>${contact.nickname }</td> <!-- 显示昵称 -->
                    <td>
                        <button onclick="toggleBlacklist(${contact.id})">移出黑名单</button>
                    </td>
                `;
                blacklistList.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching blacklist contacts:', error));
}
function filterByBookmark(bookmark) {
    fetch(`${BASE_URL}/contacts_by_bookmark/${bookmark}`)
        .then(response => response.json())
        .then(data => {
            const contactList = document.getElementById('contact-list');
            contactList.innerHTML = '';

            if (data.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="7">无联系人</td>`;
                contactList.appendChild(row);
            } else {
                data.forEach(contact => {
                    const row = document.createElement('tr');
                    row.className = 'contact';
                    row.innerHTML = `
                        <td class="${contact.special_care ? 'special-care' : ''}">${contact.name}</td>
                        <td>${contact.phone}</td>
                        <td>${contact.student_id}</td>
                        <td>${contact.email || ''}</td>
                        <td>${contact.address || ''}</td>
                        <td>${contact.nickname || ''}</td>
                        <td>
                            <div class="action-buttons">
                                <button onclick="deleteContact(${contact.id})">删除</button>
                                <button onclick="toggleSpecialCare(${contact.id})">
                                    ${contact.special_care ? '取消特别关心' : '特别关心'}
                                </button>
                                <button onclick="toggleBlacklist(${contact.id})">
                                    ${contact.blacklist ? '移出黑名单' : '黑名单'}
                                </button>
        
                                <button onclick="toggleBookmark(${contact.id}, 'friends')">
                                    ${contact.bookmark === 'friends' ? '取消经常联系' : '经常联系'}
                                </button>
                            </div>
                        </td>
                    `;
                    contactList.appendChild(row);
                });
            }


            // 确保“全部联系人”按钮始终可见
       
            if (allContactsBtn) {
                allContactsBtn.style.display = 'inline-block';
            }
        })
        .catch(error => console.error('Error fetching bookmarked contacts:', error));
}

function toggleBookmark(contactId, bookmarkType) {
    fetch(`${BASE_URL}/toggle_bookmark/${contactId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmark: bookmarkType })
    })
    .then(response => {
        if (response.ok) {
            loadContacts(); // 更新联系人列表
        } else {
            console.error('Failed to toggle bookmark');
        }
    })
    .catch(error => console.error('Error toggling bookmark:', error));
}

// 加载所有联系人并更新表格
function loadContacts() {
    fetch(`${BASE_URL}/contacts`)
        .then(response => response.json())
        .then(data => {
            const contactList = document.getElementById('contact-list');
            contactList.innerHTML = '';
            data.forEach(contact => {
                const row = document.createElement('tr');
                row.className = 'contact';
                row.innerHTML = `
                    <td class="${contact.special_care ? 'special-care' : ''}">${contact.name}</td>
                    <td id="phone-list-${contact.id}">
                        ${contact.phones.map(phone => `<div>${phone}</div>`).join('')}
                    </td>
                    <td>${contact.student_id}</td>
                    <td>${contact.email }</td> <!-- 显示邮箱 -->
                    <td>${contact.address }</td> <!-- 显示地址 -->
                    <td>${contact.nickname }</td> <!-- 显示昵称 -->
                    <td>
                        <div class="action-buttons">
                            <button onclick="deleteContact(${contact.id})">删除</button>
     
                            <button onclick="toggleBookmark(${contact.id}, 'friends')">
                                ${contact.bookmark === 'friends' ? '取消经常联系' : '经常联系'}
                            </button>
                            <button onclick="toggleSpecialCare(${contact.id})">${contact.special_care ? '取消特别关心' : '特别关心'}</button>
                            <button onclick="toggleBlacklist(${contact.id})">${contact.blacklist ? '移出黑名单' : '黑名单'}</button>
                            <button onclick="editContact(${contact.id})">编辑</button> <!-- 新增编辑按钮 -->
                            <button onclick="addPhone(${contact.id})">增加手机号</button>

                        </div>
                    </td>
                `;
                contactList.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching contacts:', error));
}

// 添加联系人
function addContact() {
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const studentId = document.getElementById('student_id').value;
    const email = document.getElementById('email').value ; 
    const address = document.getElementById('address').value ; 
    const nickname = document.getElementById('nickname').value ; 
    fetch(`${BASE_URL}/add_contact`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, phone, student_id: studentId, email, address, nickname })
    })
    .then(response => {
        if (response.ok) {
            loadContacts(); // 成功后重新获取联系人列表
            document.getElementById('add-contact-form').reset(); // 重置表单
        } else {
            console.error('Failed to add contact');
        }
    })
    .catch(error => console.error('Error adding contact:', error));
}

// 删除联系人
function deleteContact(id) {
    fetch(`${BASE_URL}/delete_contact/${id}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            loadContacts(); // 成功后重新获取联系人列表
        } else {
            console.error('Failed to delete contact');
        }
    })
    .catch(error => console.error('Error deleting contact:', error));
}

// 切换特别关心状态
function toggleSpecialCare(id) {
    fetch(`${BASE_URL}/toggle_special_care/${id}`, {
        method: 'POST'
    })
    .then(response => {
        if (response.ok) {
            loadContacts();  // 成功后重新获取联系人列表
        } else {
            console.error('Failed to toggle special care');
        }
    })
    .catch(error => console.error('Error toggling special care:', error));
}

// 切换黑名单状态
function toggleBlacklist(id) {
    fetch(`${BASE_URL}/toggle_blacklist/${id}`, {
        method: 'POST'
    })
    .then(response => {
        if (response.ok) {
            // 如果当前页面是黑名单页面，重新加载黑名单
            if (window.location.pathname.includes('blacklist.html')) {
                loadBlacklist();
            } else {
                loadContacts();  // 如果是主页面，重新加载联系人列表
            }
        } else {
            console.error('Failed to toggle blacklist');
        }
    })
    .catch(error => console.error('Error toggling blacklist:', error));
}

// 导航到黑名单页面
function viewBlacklist() {
    window.location.href = 'blacklist.html';
}

