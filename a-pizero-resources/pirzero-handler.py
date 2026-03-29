import uuid
import socket
import os
import requests
import json

#get machine address
def get_mac_address():
    mcaddress = uuid.getnode()
    mac_address = ':'.join(("%012X" % mcaddress)[i:i+2] for i in range(0, 12, 2))
    return mac_address

#define variables
hosrtname = socket.gethostname() #hostname variable
macaddress = get_mac_address() #macaddress variable

#cast machine address
def cast_system_info():
    url = '192.168.1.200/api/system_info'
    system_info = {
        'hostname': hostname,
        'mac_address': macaddress
    }
    response = requests.post(url, json=system_info)
    return response.status_code
#shutdown the system
def shutdown():
    os.system('sudo shutdown -h now')
    return 

