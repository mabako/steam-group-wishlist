require 'open-uri'

class GroupController < ApplicationController
  def show
    respond_to do |format|
      format.json {
        members = Rails.cache.fetch("group_#{params[:id]}", :expires_in => 1.hour) do
          doc = Nokogiri::XML(open("http://steamcommunity.com/groups/#{params[:id]}/memberslistxml/?xml=1").read)
          
          members = []
          doc.search('members/steamID64').each do |id|
            members << id.content
          end
          members
        end
        
        render :json => members
      }
      format.html
    end
  end
end
